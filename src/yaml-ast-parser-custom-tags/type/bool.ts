/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

declare function require(n: string): any;

'use strict';

import { Type } from '../type';

function resolveYamlBoolean(data) {
  if (null === data) {
    return false;
  }

  var max = data.length;

  return (
    (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
    (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'))
  );
}

function constructYamlBoolean(data) {
  return data === 'true' || data === 'True' || data === 'TRUE';
}

function isBoolean(object) {
  return '[object Boolean]' === Object.prototype.toString.call(object);
}

export default new Type('tag:yaml.org,2002:bool', {
  kind: 'scalar',
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? 'true' : 'false';
    },
    uppercase: function(object) {
      return object ? 'TRUE' : 'FALSE';
    },
    camelcase: function(object) {
      return object ? 'True' : 'False';
    },
  },
  defaultStyle: 'lowercase',
});
