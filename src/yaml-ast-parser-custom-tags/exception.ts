/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import Mark from './mark';
'use strict';
class YAMLException {
  message: string;
  reason: string;
  name: string;
  mark: Mark;
  isWarning: boolean;

  private static CLASS_IDENTIFIER = 'yaml-ast-parser.YAMLException';

  public static isInstance(instance: any): instance is YAMLException {
    if (
      instance != null &&
      instance.getClassIdentifier &&
      typeof instance.getClassIdentifier == 'function'
    ) {
      for (let currentIdentifier of instance.getClassIdentifier()) {
        if (currentIdentifier == YAMLException.CLASS_IDENTIFIER) return true;
      }
    }

    return false;
  }

  public getClassIdentifier(): string[] {
    var superIdentifiers = [];

    return superIdentifiers.concat(YAMLException.CLASS_IDENTIFIER);
  }

  constructor(reason: string, mark: Mark = null, isWarning = false) {
    this.name = 'YAMLException';
    this.reason = reason;
    this.mark = mark;
    this.message = this.toString(false);
    this.isWarning = isWarning;
  }

  toString(compact: boolean = false) {
    var result;

    result = 'JS-YAML: ' + (this.reason || '(unknown reason)');

    if (!compact && this.mark) {
      result += ' ' + this.mark.toString();
    }

    return result;
  }
}
export default YAMLException;
