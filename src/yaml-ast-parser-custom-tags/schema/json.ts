/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

// Standard YAML's JSON schema.
// http://www.yaml.org/spec/1.2/spec.html#id2803231
//
// NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
// So, this schema is not such strict as defined in the YAML specification.
// It allows numbers in binary notaion, use `Null` and `NULL` as `null`, etc.

'use strict';
import { Schema } from '../schema';
import failsafe from './failsafe';
import typeNull from '../type/null';
import typeBool from '../type/bool';
import typeInt from '../type/int';
import typeFloat from '../type/float';

export default new Schema({
  include: [failsafe],
  implicit: [typeNull, typeBool, typeInt, typeFloat],
});
