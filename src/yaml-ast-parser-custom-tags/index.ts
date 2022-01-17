/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/**
 * Created by kor on 06/05/15.
 */

export { load, loadAll, safeLoad, safeLoadAll, LoadOptions } from './loader';
export { dump, safeDump } from './dumper';

import Mark from './mark';
import YAMLException from './exception';

export * from './yamlAST';

export type Error = YAMLException;

function deprecated(name) {
  return function() {
    throw new Error('Function ' + name + ' is deprecated and cannot be used.');
  };
}

export * from './scalarInference';
