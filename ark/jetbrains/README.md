# ArkType for JetBrains IDEs

The JetBrains plugin for [ArkType](https://arktype.io): what the [VS Code extension](../extension) does, for WebStorm, IntelliJ IDEA and any JetBrains IDE with JavaScript support, 2025.2 or later.

It doesn't reimplement the extension. It runs the extension's own files, so a change there reaches both editors:

| VS Code extension                                                   | Here                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `injected.tmLanguage.json`, injected into the `injectTo` hosts      | the same file, run with the same host grammars (`@shikijs/langs`) by a Kotlin port of VS Code's TextMate tokenizer (`core/.../textmate`). Each run of string text whose category it changes is recolored (`ArkTypeHighlightingAnnotator`), in `.ts`, `.tsx`, `.js`, `.jsx`, `.mdx`, `.svelte`, `.vue`, `.astro` and `.md` files |
| ErrorLens, with the `errorLens.*` defaults from `package.json`      | `InlineErrors`: the problem closest to the cursor at the end of its line, rewritten by the same `errorLens.replace` rules read from `package.json`, through a port of ErrorLens's message pipeline (`core/.../errors`)                                                                                                          |
| `"editor.quickSuggestions": { "strings": "on" }`                    | `ArkTypeCompletionConfidence`: completion pops up while typing in a definition's strings                                                                                                                                                                                                                                        |
| `typescript.preferences.autoImportSpecifierExcludeRegexes` (manual) | the same regexes under Settings \| Tools \| ArkType, applied to the IDE's auto-import (`AutoImportSpecifierFilter`)                                                                                                                                                                                                             |

> [!NOTE]
> The IDE colors code outside strings from its own TypeScript parser, not TextMate, so the few places the extension changes how VS Code colors code in a definition (an object key's `:`, a variable inside a definition) look as they do anywhere else in the IDE.

## Development

Needs JDK 21 (`brew install openjdk@21`) and `pnpm i` at the repo root, since Gradle writes the grammars from `ark/extension` and `node_modules`.

```sh
./gradlew :core:test    # the TextMate port and ErrorLens rewriting, checked against ark/editor-conformance; no IDE download
./gradlew :plugin:test  # the IDE integration, in a headless WebStorm
./gradlew :plugin:runIde  # a WebStorm with the plugin installed
pnpm diffEngine         # the TextMate port against vscode-textmate itself, token for token, over the repo's own files
```

`core` has no IDE dependencies; `plugin` holds everything that touches the IDE. CI runs `:core:test`, `:plugin:test` and `:plugin:verifyPlugin` (`.github/workflows/jetbrains.yml`) when this package, `ark/extension` or `ark/editor-conformance` changes.

## Publishing

The first release has to be uploaded by hand; JetBrains reviews it before listing it.

1. Sign in to [JetBrains Marketplace](https://plugins.jetbrains.com) and create an `ArkType` organization to publish under.
2. Generate a signing key and certificate as [Plugin Signing](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html) describes, and keep them as the `CERTIFICATE_CHAIN`, `PRIVATE_KEY` and `PRIVATE_KEY_PASSWORD` secrets.
3. Run `./gradlew :plugin:verifyPlugin` (checks compatibility with current IDEs) and `./gradlew :plugin:signPlugin` with those variables set.
4. Upload `plugin/build/distributions/*-signed.zip` at [Upload plugin](https://plugins.jetbrains.com/plugin/add): license MIT, source code `https://github.com/arktypeio/arktype/tree/main/ark/jetbrains`, tags JavaScript, TypeScript and Code tools.
5. Once it's listed, point the JetBrains section of `ark/docs/content/docs/(arktype)/editor.mdx` at the plugin's page, and let [the community plugin](https://plugins.jetbrains.com/plugin/27099-arktype)'s author know.
6. Later releases: bump `version` in `plugin/build.gradle.kts`, then `./gradlew :plugin:publishPlugin` with a Marketplace token as `PUBLISH_TOKEN`.
