/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

// Standard YAML's Failsafe schema.
// http://www.yaml.org/spec/1.2/spec.html#id2802346

'use strict';

import { Schema } from '../schema';
import typeStr from '../type/str';
import typeSeq from '../type/seq';
import typeMap from '../type/map';

export default new Schema({
  explicit: [typeStr, typeSeq, typeMap],
});
