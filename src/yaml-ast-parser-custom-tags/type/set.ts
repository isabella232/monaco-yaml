/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

import { Type } from '../type';
import * as ast from '../yamlAST';

var _hasOwnProperty = Object.prototype.hasOwnProperty;

function resolveYamlSet(data) {
  if (null === data) {
    return true;
  }

  if (data.kind != ast.Kind.MAP) {
    return false;
  }

  return true;
}

function constructYamlSet(data) {
  return null !== data ? data : {};
}

export default new Type('tag:yaml.org,2002:set', {
  kind: 'mapping',
  resolve: resolveYamlSet,
  construct: constructYamlSet,
});
