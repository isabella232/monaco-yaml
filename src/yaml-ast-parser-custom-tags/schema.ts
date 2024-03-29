/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

/*eslint-disable max-len*/

import * as common from './common';
import YAMLException from './exception';
import { Type } from './type';

function compileList(schema: Schema, name, result) {
  var exclude = [];

  schema.include.forEach(function(includedSchema) {
    result = compileList(includedSchema, name, result);
  });

  schema[name].forEach(function(currentType) {
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag) {
        exclude.push(previousIndex);
      }
    });

    result.push(currentType);
  });

  return result.filter(function(type, index) {
    return -1 === exclude.indexOf(index);
  });
}

function compileMap(/* lists... */) {
  var result = {},
    index,
    length;

  function collectType(type) {
    result[type.tag] = type;
  }

  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }

  return result;
}

export interface SchemaDefinition {
  include?: Schema[];
  implicit?: Type[];
  explicit?: Type[];
}

export class Schema {
  include: Schema[];
  implicit: Type[];
  explicit: Type[];

  compiledImplicit: any[];
  compiledExplicit: any[];
  compiledTypeMap: any[];
  constructor(definition: SchemaDefinition) {
    this.include = definition.include || [];
    this.implicit = definition.implicit || [];
    this.explicit = definition.explicit || [];

    this.implicit.forEach(function(type) {
      if (type.loadKind && 'scalar' !== type.loadKind) {
        throw new YAMLException(
          'There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.'
        );
      }
    });

    this.compiledImplicit = compileList(this, 'implicit', []);
    this.compiledExplicit = compileList(this, 'explicit', []);
    this.compiledTypeMap = (<any>compileMap)(
      this.compiledImplicit,
      this.compiledExplicit
    );
  }

  static DEFAULT = null;
  static create = function createSchema() {
    var schemas, types;

    switch (arguments.length) {
      case 1:
        schemas = Schema.DEFAULT;
        types = arguments[0];
        break;

      case 2:
        schemas = arguments[0];
        types = arguments[1];
        break;

      default:
        throw new YAMLException(
          'Wrong number of arguments for Schema.create function'
        );
    }

    schemas = common.toArray(schemas);
    types = common.toArray(types);

    if (
      !schemas.every(function(schema) {
        return schema instanceof Schema;
      })
    ) {
      throw new YAMLException(
        'Specified list of super schemas (or a single Schema object) contains a non-Schema object.'
      );
    }

    if (
      !types.every(function(type) {
        return type instanceof Type;
      })
    ) {
      throw new YAMLException(
        'Specified list of YAML types (or a single Type object) contains a non-Type object.'
      );
    }

    return new Schema({
      include: schemas,
      explicit: types,
    });
  };
}
