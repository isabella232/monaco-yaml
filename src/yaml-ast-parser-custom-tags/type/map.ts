/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

import { Type } from '../type';

export default new Type('tag:yaml.org,2002:map', {
  kind: 'mapping',
  construct: function(data) {
    return null !== data ? data : {};
  },
});
