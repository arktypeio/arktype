<div align="center">
  <img src="https://arktype.io/image/logo.png" height="64px" />
  <h1>ArkDark</h1>
</div>

<div align="center">

[ArkType](https://arktype.io) syntax highlighting and theme⛵

</div>

## Features

- syntax highlighting for strings that are part of an ArkType definition

![syntax highlighting](/ark/dark/highlighting.png)

- inline type error summaries optimized for ArkType via [ErrorLens](https://github.com/usernamehw/vscode-error-lens)

![errorLens](/ark/dark/errorLens.png)

- optional editor theme based on ArkType palette and optimized for type syntax

![theme](/ark/dark/theme.png)

The low-poly animal backgrounds from these images are not part of the theme but are images from [this theme](https://apps.microsoft.com/detail/9pbdb440swlc?hl=en-tc&gl=TC) rendered using the excellent [Background](https://github.com/KatsuteDev/Background) extension by [@Katsute](https://github.com/Katsute).

#### Update syntax highlighting rules

See [injected.tmLanguage.json](/ark/dark/injected.tmLanguage.json)

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
