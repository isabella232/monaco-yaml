/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as Parser from '../parser/jsonParser07';
import { ASTNode, ObjectASTNode, PropertyASTNode } from '../jsonASTTypes';
import { parse as parseYAML } from '../parser/yamlParser07';
import { YAMLSchemaService } from './yamlSchemaService';
import { JSONSchema, JSONSchemaRef } from '../jsonSchema07';
import {
  PromiseConstructor,
  Thenable,
  JSONWorkerContribution,
  CompletionsCollector,
} from 'vscode-json-languageservice';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  TextDocument,
  Position,
  Range,
  TextEdit,
  InsertTextFormat,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver-types';
import * as nls from 'vscode-nls';
import {
  getLineOffsets,
  filterInvalidCustomTags,
  matchOffsetToDocument,
} from '../utils/arrUtils';
import { LanguageSettings } from '../yamlLanguageService';
import { ResolvedSchema } from 'vscode-json-languageservice/lib/umd/services/jsonSchemaService';
import { JSONCompletion } from 'vscode-json-languageservice/lib/umd/services/jsonCompletion';
import { ClientCapabilities } from 'vscode-languageserver-protocol';
import { stringifyObject } from '../utils/json';
const localize = nls.loadMessageBundle();

export class YAMLCompletion extends JSONCompletion {
  private schemaService: YAMLSchemaService;
  private contributions: JSONWorkerContribution[];
  private promise: PromiseConstructor;
  private customTags: Array<String>;
  private completion: boolean;
  private supportsMarkdown: boolean | undefined;

  constructor(
    schemaService: YAMLSchemaService,
    contributions: JSONWorkerContribution[] = [],
    promiseConstructor: PromiseConstructor = Promise,
    private clientCapabilities: ClientCapabilities = {}
  ) {
    super(schemaService, contributions, promiseConstructor);
    this.schemaService = schemaService;
    this.contributions = contributions;
    this.promise = promiseConstructor || Promise;
    this.customTags = [];
    this.completion = true;
  }

  public configure(
    languageSettings: LanguageSettings,
    customTags: Array<String>
  ) {
    if (languageSettings) {
      this.completion = languageSettings.completion;
    }
    this.customTags = customTags;
  }

  public doResolve(item: CompletionItem): Thenable<CompletionItem> {
    for (let i = this.contributions.length - 1; i >= 0; i--) {
      if (this.contributions[i].resolveCompletion) {
        const resolver = this.contributions[i].resolveCompletion(item);
        if (resolver) {
          return resolver;
        }
      }
    }
    return this.promise.resolve(item);
  }

  public doComplete(
    document: TextDocument,
    position: Position,
    isKubernetes: boolean = false
  ): Thenable<CompletionList> {
    const result: CompletionList = {
      items: [],
      isIncomplete: false,
    };

    if (!this.completion) {
      return Promise.resolve(result);
    }
    const completionFix = this.completionHelper(document, position);
    const newText = completionFix.newText;
    const doc = parseYAML(newText);
    this.setKubernetesParserOption(doc.documents, isKubernetes);

    const offset = document.offsetAt(position);
    if (document.getText()[offset] === ':') {
      return Promise.resolve(result);
    }

    const currentDoc = matchOffsetToDocument(offset, doc);
    if (currentDoc === null) {
      return Promise.resolve(result);
    }
    const currentDocIndex = doc.documents.indexOf(currentDoc);
    let node = currentDoc.getNodeFromOffsetEndInclusive(offset);
    // if (this.isInComment(document, node ? node.start : 0, offset)) {
    // 	return Promise.resolve(result);
    // }

    const currentWord = super.getCurrentWord(document, offset);

    let overwriteRange = null;
    if (node && node.type === 'null') {
      const nodeStartPos = document.positionAt(node.offset);
      nodeStartPos.character += 1;
      const nodeEndPos = document.positionAt(node.offset + node.length);
      nodeEndPos.character += 1;
      overwriteRange = Range.create(nodeStartPos, nodeEndPos);
    } else if (
      node &&
      (node.type === 'string' ||
        node.type === 'number' ||
        node.type === 'boolean')
    ) {
      overwriteRange = Range.create(
        document.positionAt(node.offset),
        document.positionAt(node.offset + node.length)
      );
    } else {
      let overwriteStart = offset - currentWord.length;
      if (
        overwriteStart > 0 &&
        document.getText()[overwriteStart - 1] === '"'
      ) {
        overwriteStart--;
      }
      overwriteRange = Range.create(
        document.positionAt(overwriteStart),
        position
      );
    }

    const proposed: { [key: string]: CompletionItem } = {};
    const collector: CompletionsCollector = {
      add: (suggestion: CompletionItem) => {
        let label = suggestion.label;
        const existing = proposed[label];
        if (!existing) {
          label = label.replace(/[\n]/g, '↵');
          if (label.length > 60) {
            const shortendedLabel = label.substr(0, 57).trim() + '...';
            if (!proposed[shortendedLabel]) {
              label = shortendedLabel;
            }
          }
          if (
            overwriteRange &&
            overwriteRange.start.line === overwriteRange.end.line
          ) {
            suggestion.textEdit = TextEdit.replace(
              overwriteRange,
              suggestion.insertText
            );
          }
          suggestion.label = label;
          proposed[label] = suggestion;
          result.items.push(suggestion);
        } else if (!existing.documentation) {
          existing.documentation = suggestion.documentation;
        }
      },
      setAsIncomplete: () => {
        result.isIncomplete = true;
      },
      error: (message: string) => {
        console.error(message);
      },
      log: (message: string) => {
        console.log(message);
      },
      getNumberOfProposals: () => result.items.length,
    };

    if (this.customTags.length > 0) {
      this.getCustomTagValueCompletions(collector);
    }

    currentDoc.currentDocIndex = currentDocIndex;
    return this.schemaService
      .getSchemaForResource(document.uri, currentDoc)
      .then(schema => {
        if (!schema) {
          return Promise.resolve(result);
        }
        const newSchema = schema;

        // tslint:disable-next-line: no-any
        const collectionPromises: Thenable<any>[] = [];

        let addValue = true;
        let currentKey = '';

        let currentProperty: PropertyASTNode = null;
        if (node) {
          if (node.type === 'string') {
            const parent = node.parent;
            if (
              parent &&
              parent.type === 'property' &&
              parent.keyNode === node
            ) {
              addValue = !parent.valueNode;
              currentProperty = parent;
              currentKey = document
                .getText()
                .substr(node.offset + 1, node.length - 2);
              if (parent) {
                node = parent.parent;
              }
            }
          }
        }

        // proposals for properties
        if (node && node.type === 'object') {
          // don't suggest properties that are already present
          const properties = (<ObjectASTNode>node).properties;
          properties.forEach(p => {
            if (!currentProperty || currentProperty !== p) {
              proposed[p.keyNode.value] = CompletionItem.create('__');
            }
          });

          const separatorAfter = '';
          if (newSchema) {
            // property proposals with schema
            this.getPropertyCompletions(
              newSchema,
              currentDoc,
              node,
              addValue,
              separatorAfter,
              collector,
              document
            );
          }

          const location = Parser.getNodePath(node);
          this.contributions.forEach(contribution => {
            const collectPromise = contribution.collectPropertyCompletions(
              document.uri,
              location,
              currentWord,
              addValue,
              false,
              collector
            );
            if (collectPromise) {
              collectionPromises.push(collectPromise);
            }
          });
          if (
            !schema &&
            currentWord.length > 0 &&
            document.getText().charAt(offset - currentWord.length - 1) !== '"'
          ) {
            collector.add({
              kind: CompletionItemKind.Property,
              label: currentWord,
              insertText: this.getInsertTextForProperty(
                currentWord,
                null,
                false,
                separatorAfter
              ),
              insertTextFormat: InsertTextFormat.Snippet,
              documentation: '',
            });
          }
        }

        // proposals for values
        const types: { [type: string]: boolean } = {};
        if (newSchema) {
          this.getValueCompletions(
            newSchema,
            currentDoc,
            node,
            offset,
            document,
            collector,
            types
          );
        }
        if (this.contributions.length > 0) {
          super.getContributedValueCompletions(
            currentDoc,
            node,
            offset,
            document,
            collector,
            collectionPromises
          );
        }

        return this.promise.all(collectionPromises).then(() => result);
      });
  }

  private getPropertyCompletions(
    schema: ResolvedSchema,
    doc: Parser.JSONDocument,
    node: ASTNode,
    addValue: boolean,
    separatorAfter: string,
    collector: CompletionsCollector,
    document
  ): void {
    const matchingSchemas = doc.getMatchingSchemas(schema.schema);
    matchingSchemas.forEach(s => {
      if (s.node === node && !s.inverted) {
        const schemaProperties = s.schema.properties;
        if (schemaProperties) {
          Object.keys(schemaProperties).forEach((key: string) => {
            const propertySchema = schemaProperties[key];
            if (
              typeof propertySchema === 'object' &&
              !propertySchema.deprecationMessage &&
              !propertySchema['doNotSuggest']
            ) {
              let identCompensation = '';
              if (node.parent && node.parent.type === 'array') {
                // because there is a slash '-' to prevent the properties generated to have the correct
                // indent
                const sourceText = document.getText();
                const indexOfSlash = sourceText.lastIndexOf(
                  '-',
                  node.offset - 1
                );
                if (indexOfSlash > 0) {
                  // add one space to compensate the '-'
                  identCompensation =
                    ' ' + sourceText.slice(indexOfSlash + 1, node.offset);
                }
              }
              collector.add({
                kind: CompletionItemKind.Property,
                label: key,
                insertText: this.getInsertTextForProperty(
                  key,
                  propertySchema,
                  addValue,
                  separatorAfter,
                  identCompensation + '\t'
                ),
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: propertySchema.description || '',
              });
            }
          });
        }
        // Error fix
        // If this is a array of string/boolean/number
        //  test:
        //    - item1
        // it will treated as a property key since `:` has been appended
        if (
          node.type === 'object' &&
          node.parent &&
          node.parent.type === 'array' &&
          s.schema.type !== 'object'
        ) {
          this.addSchemaValueCompletions(
            s.schema,
            separatorAfter,
            collector,
            {}
          );
        }
      }
    });
  }

  private getValueCompletions(
    schema: ResolvedSchema,
    doc: Parser.JSONDocument,
    node: ASTNode,
    offset: number,
    document: TextDocument,
    collector: CompletionsCollector,
    types: { [type: string]: boolean }
  ): void {
    let offsetForSeparator = offset;
    let parentKey: string = null;
    let valueNode: ASTNode = null;

    if (
      node &&
      (node.type === 'string' ||
        node.type === 'number' ||
        node.type === 'boolean')
    ) {
      offsetForSeparator = node.offset + node.length;
      valueNode = node;
      node = node.parent;
    }

    if (node && node.type === 'null') {
      const nodeParent = node.parent;

      /*
       * This is going to be an object for some reason and we need to find the property
       * Its an issue with the null node
       */
      if (nodeParent && nodeParent.type === 'object') {
        for (const prop in nodeParent['properties']) {
          const currNode = nodeParent['properties'][prop];
          if (currNode.keyNode && currNode.keyNode.value === node.location) {
            node = currNode;
          }
        }
      }
    }

    if (!node) {
      this.addSchemaValueCompletions(schema.schema, '', collector, types);
      return;
    }

    if (
      node.type === 'property' &&
      offset > (<PropertyASTNode>node).colonOffset
    ) {
      const valueNode = node.valueNode;
      if (valueNode && offset > valueNode.offset + valueNode.length) {
        return; // we are past the value node
      }
      parentKey = node.keyNode.value;
      node = node.parent;
    }

    if (node && (parentKey !== null || node.type === 'array')) {
      const separatorAfter = '';
      const matchingSchemas = doc.getMatchingSchemas(schema.schema);
      matchingSchemas.forEach(s => {
        if (s.node === node && !s.inverted && s.schema) {
          if (s.schema.items) {
            if (Array.isArray(s.schema.items)) {
              const index = super.findItemAtOffset(node, document, offset);
              if (index < s.schema.items.length) {
                this.addSchemaValueCompletions(
                  s.schema.items[index],
                  separatorAfter,
                  collector,
                  types
                );
              }
            } else if (
              typeof s.schema.items === 'object' &&
              s.schema.items.type === 'object'
            ) {
              collector.add({
                kind: super.getSuggestionKind(s.schema.items.type),
                label: '- (array item)',
                documentation: `Create an item of an array${
                  s.schema.description === undefined
                    ? ''
                    : '(' + s.schema.description + ')'
                }`,
                insertText: `- ${this.getInsertTextForObject(
                  s.schema.items,
                  separatorAfter
                ).insertText.trimLeft()}`,
                insertTextFormat: InsertTextFormat.Snippet,
              });
            } else {
              this.addSchemaValueCompletions(
                s.schema.items,
                separatorAfter,
                collector,
                types
              );
            }
          }
          if (s.schema.properties) {
            const propertySchema = s.schema.properties[parentKey];
            if (propertySchema) {
              this.addSchemaValueCompletions(
                propertySchema,
                separatorAfter,
                collector,
                types
              );
            }
          }
        }
      });

      if (types['boolean']) {
        this.addBooleanValueCompletion(true, separatorAfter, collector);
        this.addBooleanValueCompletion(false, separatorAfter, collector);
      }
      if (types['null']) {
        this.addNullValueCompletion(separatorAfter, collector);
      }
    }
  }

  private getCustomTagValueCompletions(collector: CompletionsCollector) {
    const validCustomTags = filterInvalidCustomTags(this.customTags);
    validCustomTags.forEach(validTag => {
      // Valid custom tags are guarenteed to be strings
      const label = validTag.split(' ')[0];
      this.addCustomTagValueCompletion(collector, ' ', label);
    });
  }

  private addSchemaValueCompletions(
    schema: JSONSchemaRef,
    separatorAfter: string,
    collector: CompletionsCollector,
    types: { [type: string]: boolean }
  ): void {
    super.addSchemaValueCompletions(schema, separatorAfter, collector, types);
  }

  private addDefaultValueCompletions(
    schema: JSONSchema,
    separatorAfter: string,
    collector: CompletionsCollector,
    arrayDepth = 0
  ): void {
    let hasProposals = false;
    if (isDefined(schema.default)) {
      let type = schema.type;
      let value = schema.default;
      for (let i = arrayDepth; i > 0; i--) {
        value = [value];
        type = 'array';
      }
      collector.add({
        kind: this.getSuggestionKind(type),
        label: value.toString(),
        insertText: this.getInsertTextForValue(value, separatorAfter),
        insertTextFormat: InsertTextFormat.Snippet,
        detail: localize('json.suggest.default', 'Default value'),
      });
      hasProposals = true;
    }
    if (Array.isArray(schema.examples)) {
      schema.examples.forEach(example => {
        let type = schema.type;
        let value = example;
        for (let i = arrayDepth; i > 0; i--) {
          value = [value];
          type = 'array';
        }
        collector.add({
          kind: this.getSuggestionKind(type),
          label: value,
          insertText: this.getInsertTextForValue(value, separatorAfter),
          insertTextFormat: InsertTextFormat.Snippet,
        });
        hasProposals = true;
      });
    }
    if (Array.isArray(schema.defaultSnippets)) {
      schema.defaultSnippets.forEach(s => {
        let type = schema.type;
        let value = s.body;
        let label = s.label;
        let insertText: string;
        let filterText: string;
        if (isDefined(value)) {
          let type = schema.type;
          for (let i = arrayDepth; i > 0; i--) {
            value = [value];
            type = 'array';
          }
          insertText = this.getInsertTextForSnippetValue(value, separatorAfter);
          label = label || this.getLabelForSnippetValue(value);
        } else if (typeof s.bodyText === 'string') {
          let prefix = '',
            suffix = '',
            indent = '';
          for (let i = arrayDepth; i > 0; i--) {
            prefix = prefix + indent + '[\n';
            suffix = suffix + '\n' + indent + ']';
            indent += '\t';
            type = 'array';
          }
          insertText =
            prefix +
            indent +
            s.bodyText.split('\n').join('\n' + indent) +
            suffix +
            separatorAfter;
          (label = label || insertText),
            (filterText = insertText.replace(/[\n]/g, '')); // remove new lines
        }
        collector.add({
          kind: this.getSuggestionKind(type),
          label,
          documentation:
            super.fromMarkup(s.markdownDescription) || s.description,
          insertText,
          insertTextFormat: InsertTextFormat.Snippet,
          filterText,
        });
        hasProposals = true;
      });
    }
    if (
      !hasProposals &&
      typeof schema.items === 'object' &&
      !Array.isArray(schema.items)
    ) {
      this.addDefaultValueCompletions(
        schema.items,
        separatorAfter,
        collector,
        arrayDepth + 1
      );
    }
  }

  // tslint:disable-next-line:no-any
  private getInsertTextForSnippetValue(
    value: any,
    separatorAfter: string
  ): string {
    // tslint:disable-next-line:no-any
    const replacer = (value: any) => {
      if (typeof value === 'string') {
        if (value[0] === '^') {
          return value.substr(1);
        }
      }
      return JSON.stringify(value);
    };
    return stringifyObject(value, '', replacer) + separatorAfter;
  }

  // tslint:disable-next-line:no-any
  private getLabelForSnippetValue(value: any): string {
    const label = JSON.stringify(value);
    return label.replace(/\$\{\d+:([^}]+)\}|\$\d+/g, '$1');
  }

  private addCustomTagValueCompletion(
    collector: CompletionsCollector,
    separatorAfter: string,
    label: string
  ): void {
    collector.add({
      kind: super.getSuggestionKind('string'),
      label: label,
      insertText: label + separatorAfter,
      insertTextFormat: InsertTextFormat.Snippet,
      documentation: '',
    });
  }

  private addBooleanValueCompletion(
    value: boolean,
    separatorAfter: string,
    collector: CompletionsCollector
  ): void {
    collector.add({
      kind: this.getSuggestionKind('boolean'),
      label: value ? 'true' : 'false',
      insertText: this.getInsertTextForValue(value, separatorAfter),
      insertTextFormat: InsertTextFormat.Snippet,
      documentation: '',
    });
  }

  // tslint:disable-next-line:no-any
  private getSuggestionKind(type: any): CompletionItemKind {
    if (Array.isArray(type)) {
      // tslint:disable-next-line:no-any
      const array = <any[]>type;
      type = array.length > 0 ? array[0] : null;
    }
    if (!type) {
      return CompletionItemKind.Value;
    }
    switch (type) {
      case 'string':
        return CompletionItemKind.Value;
      case 'object':
        return CompletionItemKind.Module;
      case 'property':
        return CompletionItemKind.Property;
      default:
        return CompletionItemKind.Value;
    }
  }

  private addNullValueCompletion(
    separatorAfter: string,
    collector: CompletionsCollector
  ): void {
    collector.add({
      kind: this.getSuggestionKind('null'),
      label: 'null',
      insertText: 'null' + separatorAfter,
      insertTextFormat: InsertTextFormat.Snippet,
      documentation: '',
    });
  }

  // tslint:disable-next-line: no-any
  private getInsertTextForValue(value: any, separatorAfter: string): string {
    return this.getInsertTextForPlainText(value + separatorAfter);
  }

  private getInsertTextForPlainText(text: string): string {
    return text.replace(/[\\\$\}]/g, '\\$&'); // escape $, \ and }
  }

  private getInsertTextForObject(
    schema: JSONSchema,
    separatorAfter: string,
    indent = '\t',
    insertIndex = 1
  ) {
    let insertText = '';
    if (!schema.properties) {
      insertText = `${indent}\$${insertIndex++}\n`;
      return { insertText, insertIndex };
    }

    Object.keys(schema.properties).forEach((key: string) => {
      const propertySchema = schema.properties[key] as JSONSchema;
      let type = Array.isArray(propertySchema.type)
        ? propertySchema.type[0]
        : propertySchema.type;
      if (!type) {
        if (propertySchema.properties) {
          type = 'object';
        }
        if (propertySchema.items) {
          type = 'array';
        }
      }
      if (schema.required && schema.required.indexOf(key) > -1) {
        switch (type) {
          case 'boolean':
          case 'string':
          case 'number':
          case 'integer':
            insertText += `${indent}${key}: \$${insertIndex++}\n`;
            break;
          case 'array':
            const arrayInsertResult = this.getInsertTextForArray(
              propertySchema.items,
              separatorAfter,
              `${indent}\t`,
              insertIndex++
            );
            insertIndex = arrayInsertResult.insertIndex;
            insertText += `${indent}${key}:\n${indent}\t- ${arrayInsertResult.insertText}\n`;
            break;
          case 'object':
            const objectInsertResult = this.getInsertTextForObject(
              propertySchema,
              separatorAfter,
              `${indent}\t`,
              insertIndex++
            );
            insertIndex = objectInsertResult.insertIndex;
            insertText += `${indent}${key}:\n${objectInsertResult.insertText}\n`;
            break;
        }
      } else if (propertySchema.default !== undefined) {
        switch (type) {
          case 'boolean':
          case 'string':
          case 'number':
          case 'integer':
            insertText += `${indent}${key}: \${${insertIndex++}:${
              propertySchema.default
            }}\n`;
            break;
          case 'array':
          case 'object':
            // TODO: support default value for array object
            break;
        }
      }
    });
    if (insertText.trim().length === 0) {
      insertText = `${indent}\$${insertIndex++}\n`;
    }
    insertText = insertText.trimRight() + separatorAfter;
    return { insertText, insertIndex };
  }

  // tslint:disable-next-line:no-any
  private getInsertTextForArray(
    schema: any,
    separatorAfter: string,
    indent = '\t',
    insertIndex = 1
  ) {
    let insertText = '';
    if (!schema) {
      insertText = `\$${insertIndex++}`;
    }
    let type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    if (!type) {
      if (schema.properties) {
        type = 'object';
      }
      if (schema.items) {
        type = 'array';
      }
    }
    switch (schema.type) {
      case 'boolean':
        insertText = `\${${insertIndex++}:false}`;
        break;
      case 'number':
      case 'integer':
        insertText = `\${${insertIndex++}:0}`;
        break;
      case 'string':
        insertText = `\${${insertIndex++}:null}`;
        break;
      case 'object':
        const objectInsertResult = this.getInsertTextForObject(
          schema,
          separatorAfter,
          `${indent}\t`,
          insertIndex++
        );
        insertText = objectInsertResult.insertText.trimLeft();
        insertIndex = objectInsertResult.insertIndex;
        break;
    }
    return { insertText, insertIndex };
  }

  private getInsertTextForProperty(
    key: string,
    propertySchema: JSONSchema,
    addValue: boolean,
    separatorAfter: string,
    ident: string = '\t'
  ): string {
    const propertyText = this.getInsertTextForValue(key, '');
    const resultText = propertyText + ':';

    let value;
    let nValueProposals = 0;
    if (propertySchema) {
      if (Array.isArray(propertySchema.defaultSnippets)) {
        if (propertySchema.defaultSnippets.length === 1) {
          const body = propertySchema.defaultSnippets[0].body;
          if (isDefined(body)) {
            value = this.getInsertTextForSnippetValue(body, '');
          }
        }
        nValueProposals += propertySchema.defaultSnippets.length;
      }
      if (propertySchema.enum) {
        if (!value && propertySchema.enum.length === 1) {
          value = this.getInsertTextForGuessedValue(propertySchema.enum[0], '');
        }
        nValueProposals += propertySchema.enum.length;
      }
      if (isDefined(propertySchema.default)) {
        if (!value) {
          value = this.getInsertTextForGuessedValue(propertySchema.default, '');
        }
        nValueProposals++;
      }
      if (
        Array.isArray(propertySchema.examples) &&
        propertySchema.examples.length
      ) {
        if (!value) {
          value = this.getInsertTextForGuessedValue(
            propertySchema.examples[0],
            ''
          );
        }
        nValueProposals += propertySchema.examples.length;
      }
      if (propertySchema.properties) {
        return `${resultText}\n${
          this.getInsertTextForObject(propertySchema, separatorAfter, ident)
            .insertText
        }`;
      } else if (propertySchema.items) {
        return `${resultText}\n\t- ${
          this.getInsertTextForArray(
            propertySchema.items,
            separatorAfter,
            ident
          ).insertText
        }`;
      }
      if (nValueProposals === 0) {
        let type = Array.isArray(propertySchema.type)
          ? propertySchema.type[0]
          : propertySchema.type;
        if (!type) {
          if (propertySchema.properties) {
            type = 'object';
          } else if (propertySchema.items) {
            type = 'array';
          }
        }
        switch (type) {
          case 'boolean':
            value = ' $1';
            break;
          case 'string':
            value = ' $1';
            break;
          case 'object':
            value = '\n\t';
            break;
          case 'array':
            value = '\n\t- ';
            break;
          case 'number':
          case 'integer':
            value = ' ${1:0}';
            break;
          case 'null':
            value = ' ${1:null}';
            break;
          default:
            return propertyText;
        }
      }
    }
    if (!value || nValueProposals > 1) {
      value = '$1';
    }
    return resultText + value + separatorAfter;
  }

  // tslint:disable-next-line:no-any
  private getInsertTextForGuessedValue(
    value: any,
    separatorAfter: string
  ): string {
    switch (typeof value) {
      case 'object':
        if (value === null) {
          return '${1:null}' + separatorAfter;
        }
        return this.getInsertTextForValue(value, separatorAfter);
      case 'string':
        let snippetValue = JSON.stringify(value);
        snippetValue = snippetValue.substr(1, snippetValue.length - 2); // remove quotes
        snippetValue = this.getInsertTextForPlainText(snippetValue); // escape \ and }
        return '${1:' + snippetValue + '}' + separatorAfter;
      case 'number':
      case 'boolean':
        return '${1:' + value + '}' + separatorAfter;
    }
    return this.getInsertTextForValue(value, separatorAfter);
  }

  private getLabelForValue(value: string) {
    return value;
  }

  /**
   * Corrects simple syntax mistakes to load possible nodes even if a semicolon is missing
   */
  private completionHelper(
    document: TextDocument,
    textDocumentPosition: Position
  ) {
    // Get the string we are looking at via a substring
    const linePos = textDocumentPosition.line;
    const position = textDocumentPosition;
    const lineOffset = getLineOffsets(document.getText());
    const start = lineOffset[linePos]; // Start of where the autocompletion is happening
    let end = 0; // End of where the autocompletion is happening

    if (lineOffset[linePos + 1]) {
      end = lineOffset[linePos + 1];
    } else {
      end = document.getText().length;
    }

    while (
      end - 1 >= 0 &&
      this.is_EOL(document.getText().charCodeAt(end - 1))
    ) {
      end--;
    }

    const textLine = document.getText().substring(start, end);

    // Check if the string we are looking at is a node
    if (textLine.indexOf(':') === -1) {
      // We need to add the ":" to load the nodes
      let newText = '';

      // This is for the empty line case
      const trimmedText = textLine.trim();
      if (
        trimmedText.length === 0 ||
        (trimmedText.length === 1 && trimmedText[0] === '-')
      ) {
        // Add a temp node that is in the document but we don't use at all.
        newText =
          document.getText().substring(0, start + textLine.length) +
          (trimmedText[0] === '-' && !textLine.endsWith(' ') ? ' ' : '') +
          'holder:\r\n' +
          document
            .getText()
            .substr(lineOffset[linePos + 1] || document.getText().length);

        // For when missing semi colon case
      } else {
        // Add a semicolon to the end of the current line so we can validate the node
        newText =
          document.getText().substring(0, start + textLine.length) +
          ':\r\n' +
          document
            .getText()
            .substr(lineOffset[linePos + 1] || document.getText().length);
      }

      return {
        newText: newText,
        newPosition: textDocumentPosition,
      };
    } else {
      // All the nodes are loaded
      position.character = position.character - 1;

      return {
        newText: document.getText(),
        newPosition: position,
      };
    }
  }

  private is_EOL(c: number) {
    return c === 0x0a /* LF */ || c === 0x0d /* CR */;
  }

  // Called by onCompletion
  private setKubernetesParserOption(
    jsonDocuments: Parser.JSONDocument[],
    option: boolean
  ) {
    for (const jsonDoc in jsonDocuments) {
      jsonDocuments[jsonDoc].isKubernetes = option;
    }
  }
}

// tslint:disable-next-line: no-any
function isDefined(val: any): val is object {
  return val !== undefined;
}
