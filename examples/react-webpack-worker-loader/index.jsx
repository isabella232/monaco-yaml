import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import MonacoEditor from 'react-monaco-editor';
import '@wings-software/monaco-yaml/lib/esm/monaco.contribution';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';

// NOTE: This will give you all editor featues. If you would prefer to limit to only the editor
// features you want to use, import them each individually. See this example: (https://github.com/microsoft/monaco-editor-samples/blob/master/browser-esm-webpack-small/index.js#L1-L91)
import 'monaco-editor';

// NOTE: using loader syntax becuase Yaml worker imports editor.worker directly and that
// import shouldn't go through loader syntax.
import EditorWorker from 'worker-loader!monaco-editor/esm/vs/editor/editor.worker';
import YamlWorker from 'worker-loader!@wings-software/monaco-yaml/lib/esm/yaml.worker';

window.MonacoEnvironment = {
  getWorker(workerId, label) {
    if (label === 'yaml') {
      return new YamlWorker();
    }
    return new EditorWorker();
  },
};

const { yaml } = languages || {};

const Editor = () => {
  const [value, setValue] = useState('p1: ');
  useEffect(() => {
    yaml &&
      yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        schemas: [
          {
            uri: 'http://myserver/foo-schema.json', // id of the first schema
            fileMatch: ['*'], // associate with our model
            schema: {
              type: 'object',
              required: ['type'],
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'ClassWithApiModelOverride',
                    'ClassWithoutApiModelOverride',
                  ],
                },
              },
              $schema: 'http://json-schema.org/draft-07/schema#',
              allOf: [
                {
                  if: {
                    properties: {
                      type: {
                        const: 'ClassWithoutApiModelOverride',
                      },
                    },
                  },
                  then: {
                    properties: {
                      spec: {
                        $ref: '#/definitions/ClassWithoutApiModelOverride',
                      },
                    },
                  },
                },
                {
                  if: {
                    properties: {
                      type: {
                        const: 'ClassWithApiModelOverride',
                      },
                    },
                  },
                  then: {
                    properties: {
                      spec: {
                        $ref: '#/definitions/testName',
                      },
                    },
                  },
                },
              ],
              definitions: {
                ClassWhichContainsInterface: {
                  type: 'object',
                  required: ['type'],
                  properties: {
                    type: {
                      type: 'string',
                      enum: [
                        'ClassWithApiModelOverride',
                        'ClassWithoutApiModelOverride',
                      ],
                    },
                  },
                  $schema: 'http://json-schema.org/draft-07/schema#',
                  allOf: [
                    {
                      if: {
                        properties: {
                          type: {
                            const: 'ClassWithoutApiModelOverride',
                          },
                        },
                      },
                      then: {
                        properties: {
                          spec: {
                            $ref: '#/definitions/ClassWithoutApiModelOverride',
                          },
                        },
                      },
                    },
                    {
                      if: {
                        properties: {
                          type: {
                            const: 'ClassWithApiModelOverride',
                          },
                        },
                      },
                      then: {
                        properties: {
                          spec: {
                            $ref: '#/definitions/testName',
                          },
                        },
                      },
                    },
                  ],
                },
                ClassWithoutApiModelOverride: {
                  allOf: [
                    {
                      $ref: '#/definitions/TestInterface',
                    },
                    {
                      type: 'object',
                      properties: {
                        testString: {
                          type: 'string',
                        },
                        x: {
                          type: 'string',
                        },
                        y: {
                          type: 'string',
                        },
                      },
                    },
                    {
                      oneOf: [
                        {
                          required: ['x'],
                        },
                        {
                          required: ['y'],
                        },
                      ],
                    },
                  ],
                  $schema: 'http://json-schema.org/draft-07/schema#',
                },
                TestInterface: {
                  type: 'object',
                  $schema: 'http://json-schema.org/draft-07/schema#',
                },
                testName: {
                  allOf: [
                    {
                      $ref: '#/definitions/TestInterface',
                    },
                    {
                      type: 'object',
                      required: ['testString'],
                      properties: {
                        a: {
                          type: 'string',
                        },
                        apimodelproperty: {
                          type: 'string',
                        },
                        b: {
                          type: 'string',
                        },
                        jsontypeinfo: {
                          type: 'string',
                        },
                        testString: {
                          type: 'string',
                        },
                      },
                    },
                    {
                      oneOf: [
                        {
                          required: ['apimodelproperty'],
                        },
                        {
                          required: ['jsontypeinfo'],
                        },
                      ],
                    },
                    {
                      oneOf: [
                        {
                          required: ['a'],
                        },
                        {
                          required: ['b'],
                        },
                      ],
                    },
                  ],
                  $schema: 'http://json-schema.org/draft-07/schema#',
                },
              },
            },
          },
        ],
      });
  }, []);

  return (
    <MonacoEditor
      width="800"
      height="600"
      language="yaml"
      value={value}
      onChange={setValue}
    />
  );
};

ReactDOM.render(<Editor />, document.getElementById('react'));
