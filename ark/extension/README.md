<div align="center">
  <img src="/ark/dark/icon.png" height="64px" />
  <h1>ArkType</h1>
</div>
<div align="center">

[ArkType](https://arktype.io) syntax highlighting and theme⛵

</div>

We're building a 1:1 validator for TypeScript! Check out our core project [on GitHub](https://github.com/arktypeio/arktype)!

## Features

- syntax highlighting for strings that are part of an ArkType definition

![syntax highlighting](https://github.com/arktypeio/arktype/tree/main/ark/extension/highlighting.png)

- inline type error summaries optimized for ArkType via [ErrorLens](https://github.com/usernamehw/vscode-error-lens)

![errorLens](https://github.com/arktypeio/arktype/tree/main/ark/extension/errorLens.png)

## Contributing

**Run > Debugger** (`F5` by default) will launch the extension in another window, allowing you to see the effects of your changes on whatever code you open in it.

#### Update syntax highlighting rules

See [injected.tmLanguage.json](/ark/extension/injected.tmLanguage.json)

To determine which scopes need to be changed, you can view scopes applied to any file in VSCode by opening the Command Palette (Ctrl+Shift+P by default) and searching "Developer: Inspect Editor Tokens and Scopes".

Changes to `injected.tmLanguage.json` should be mirrored to [tsWithArkType.tmLanguage.json](./tsWithArkType.tmLanguage.json).

#### Testing tsWithArkType.tmLanguage.json

To test the standalone rules for TS w/ ArkType highlighting, replace `grammars` in `package.json` with the following:

```json
"grammars": {
	"scopeName": "source.ts",
	"language": "typescript",
	"path": "tsWithArkType.tmLanguage.json"
}
```

Be sure to switch back before publishing!

> [!IMPORTANT]  
> You must reload the extension host window to see scope changes reflected
