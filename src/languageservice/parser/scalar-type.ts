/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

/**
 * Parse a boolean according to the specification
 *
 * Return:
 *  true if its a true value
 *  false if its a false value
 */
export function parseYamlBoolean(input: string): boolean {
  if (
    [
      'true',
      'True',
      'TRUE',
      'y',
      'Y',
      'yes',
      'Yes',
      'YES',
      'on',
      'On',
      'ON',
    ].lastIndexOf(input) >= 0
  ) {
    return true;
  } else if (
    [
      'false',
      'False',
      'FALSE',
      'n',
      'N',
      'no',
      'No',
      'NO',
      'off',
      'Off',
      'OFF',
    ].lastIndexOf(input) >= 0
  ) {
    return false;
  }
  throw `Invalid boolean "${input}"`;
}
