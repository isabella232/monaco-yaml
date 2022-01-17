/*
 * Copyright 2020 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { NotificationType, RequestType } from 'vscode-languageserver';

export namespace SchemaAssociationNotification {
  export const type: NotificationType<{}, {}> = new NotificationType(
    'json/schemaAssociations'
  );
}

export namespace DynamicCustomSchemaRequestRegistration {
  export const type: NotificationType<{}, {}> = new NotificationType(
    'yaml/registerCustomSchemaRequest'
  );
}

export namespace VSCodeContentRequest {
  export const type: RequestType<{}, {}, {}, {}> = new RequestType(
    'vscode/content'
  );
}

export namespace CustomSchemaContentRequest {
  export const type: RequestType<{}, {}, {}, {}> = new RequestType(
    'custom/schema/content'
  );
}

export namespace CustomSchemaRequest {
  export const type: RequestType<{}, {}, {}, {}> = new RequestType(
    'custom/schema/request'
  );
}

export namespace ColorSymbolRequest {
  export const type: RequestType<{}, {}, {}, {}> = new RequestType(
    'json/colorSymbols'
  );
}
