/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

import YAMLException from './exception';

var TYPE_CONSTRUCTOR_OPTIONS = [
  'kind',
  'resolve',
  'construct',
  'instanceOf',
  'predicate',
  'represent',
  'defaultStyle',
  'styleAliases',
];

var YAML_NODE_KINDS = ['scalar', 'sequence', 'mapping'];

function compileStyleAliases(map) {
  var result = {};

  if (null !== map) {
    Object.keys(map).forEach(function(style) {
      map[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }

  return result;
}

export class Type {
  tag;
  kind;
  resolve;
  construct;
  instanceOf;
  predicate;
  represent;
  defaultStyle;
  styleAliases;
  loadKind;

  constructor(tag, options) {
    options = options || {};

    Object.keys(options).forEach(function(name) {
      if (-1 === TYPE_CONSTRUCTOR_OPTIONS.indexOf(name)) {
        throw new YAMLException(
          'Unknown option "' +
            name +
            '" is met in definition of "' +
            tag +
            '" YAML type.'
        );
      }
    });

    // TODO: Add tag format check.
    this.tag = tag;
    this.kind = options['kind'] || null;
    this.resolve =
      options['resolve'] ||
      function() {
        return true;
      };
    this.construct =
      options['construct'] ||
      function(data) {
        return data;
      };
    this.instanceOf = options['instanceOf'] || null;
    this.predicate = options['predicate'] || null;
    this.represent = options['represent'] || null;
    this.defaultStyle = options['defaultStyle'] || null;
    this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

    if (-1 === YAML_NODE_KINDS.indexOf(this.kind)) {
      throw new YAMLException(
        'Unknown kind "' +
          this.kind +
          '" is specified for "' +
          tag +
          '" YAML type.'
      );
    }
  }
}
