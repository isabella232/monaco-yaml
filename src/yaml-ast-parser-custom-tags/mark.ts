/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

'use strict';

import * as common from './common';

class Mark {
  constructor(
    public name: string,
    public buffer: string,
    public position: number,
    public line: number,
    public column: number
  ) {}

  filePath: string;

  toLineEnd: boolean;

  getSnippet(indent: number = 0, maxLength: number = 75) {
    var head, start, tail, end, snippet;

    if (!this.buffer) {
      return null;
    }

    indent = indent || 4;
    maxLength = maxLength || 75;

    head = '';
    start = this.position;

    while (
      start > 0 &&
      -1 === '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1))
    ) {
      start -= 1;
      if (this.position - start > maxLength / 2 - 1) {
        head = ' ... ';
        start += 5;
        break;
      }
    }

    tail = '';
    end = this.position;

    while (
      end < this.buffer.length &&
      -1 === '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end))
    ) {
      end += 1;
      if (end - this.position > maxLength / 2 - 1) {
        tail = ' ... ';
        end -= 5;
        break;
      }
    }

    snippet = this.buffer.slice(start, end);

    return (
      common.repeat(' ', indent) +
      head +
      snippet +
      tail +
      '\n' +
      common.repeat(' ', indent + this.position - start + head.length) +
      '^'
    );
  }

  toString(compact: boolean = true) {
    var snippet,
      where = '';

    if (this.name) {
      where += 'in "' + this.name + '" ';
    }

    where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);

    if (!compact) {
      snippet = this.getSnippet();

      if (snippet) {
        where += ':\n' + snippet;
      }
    }

    return where;
  }
}
export default Mark;
