/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

import { Type } from '../type';

function resolveYamlNull(data) {
  if (null === data) {
    return true;
  }

  var max = data.length;

  return (
    (max === 1 && data === '~') ||
    (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'))
  );
}

function constructYamlNull() {
  return null;
}

function isNull(object) {
  return null === object;
}

export default new Type('tag:yaml.org,2002:null', {
  kind: 'scalar',
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return '~';
    },
    lowercase: function() {
      return 'null';
    },
    uppercase: function() {
      return 'NULL';
    },
    camelcase: function() {
      return 'Null';
    },
  },
  defaultStyle: 'lowercase',
});
