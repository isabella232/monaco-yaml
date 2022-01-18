/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

// JS-YAML's default schema for `load` function.
// It is not described in the YAML specification.
//
// This schema is based on JS-YAML's default safe schema and includes
// JavaScript-specific types: !!js/undefined, !!js/regexp and !!js/function.
//
// Also this schema is used as default base schema at `Schema.create` function.

'use strict';
import { Schema } from '../schema';
import defaultSafe from './default_safe';
import jsUndefined from '../type/js/undefined';
import jsRegexp from '../type/js/regexp';

var schema = new Schema({
  include: [defaultSafe],
  explicit: [jsUndefined, jsRegexp],
});

Schema.DEFAULT = schema;
export default schema;
