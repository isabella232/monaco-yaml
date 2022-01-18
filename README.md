This repo contains code used in the [Harness CD Community Edition](https://github.com/harness/harness-cd-community) which is licensed under the PolyForm Shield License 1.0.0. This repo also contains code belonging to Harness CD Enterprise Plan and [monaco-yaml](https://monaco-yaml.js.org/) which are licensed under the [PolyForm Free Trial License 1.0.0](./licenses/PolyForm-Free-Trial-1.0.0.txt) and the [MIT](./licenses/MIT.txt) license respectively. You may obtain a copy of these licenses in the [licenses](./licenses/) directory at the root of this repository.

# Monaco YAML

YAML language plugin for the Monaco Editor. It provides the following features when editing YAML files:

- Code completion, based on JSON schemas or by looking at similar objects in the same file
- Hovers, based on JSON schemas
- Validation: Syntax errors and schema validation
- Formatting
- Document Symbols
- Syntax highlighting
- Automatically load remote schema files (by enabling DiagnosticsOptions.enableSchemaRequest)

Schemas can also be provided by configuration. See [here](https://github.com/Microsoft/monaco-json/blob/master/src/monaco.d.ts)
for the API that the JSON plugin offers to configure the JSON language support.

## Publish to Harness private repository

Make changes, then increase version in package.json. Then run:

```
yarn
yarn build
npm publish
```

If you don't have permission to publish, clone UIKit and run `yarn setup` in UIKit folder to setup Harness token first. The token will be shared with this repo as well.

## Installing

`yarn add monaco-yaml`
Both vs loader and ESM are supported.
See `examples` directory for esm and umd examples.

## Development

- `git clone https://github.com/pengx17/monaco-yaml`
- `cd monaco-yaml`
- `yarn`
- open `$/monaco-yaml/demo/index.html` in your favorite browser.

## Credits

- https://github.com/redhat-developer/yaml-language-server

### Maintain

Manually clone dependencies list below and update the project files accordingly:

- `src/languageservice`: https://github.com/redhat-developer/yaml-language-server
  - `cp yaml-language-server/src/languageservice monaco-yaml/src/languageservice`
  - Modify the import paths, go to the test page and see if it still works
- `src/yaml-ast-parser-custom-tags`: https://github.com/JPinkney/yaml-ast-parser/tree/master/src
