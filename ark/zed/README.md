# ArkType for Zed

The [Zed](https://zed.dev) extension for ArkType, matching the [VS Code extension](../extension) feature for feature. [arktype.io/docs/editor](https://arktype.io/docs/editor#zed) is the user guide.

| VS Code extension                                            | Here                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `injected.tmLanguage.json`, injected into TS and its hosts   | `languages/arktype` with the grammar from [`ark/tree-sitter`](../tree-sitter), injected by the host's `injections.scm` (see [Where Zed differs](#where-zed-differs))                                                                          |
| ErrorLens with the five `errorLens.replace` rules            | the `arktype` language server: vtsls behind [`server/`](server), a proxy that makes the summary ErrorLens would show the first line of each diagnostic, the line Zed shows inline                                                             |
| `"editor.quickSuggestions": { "strings": "on" }`             | nothing: Zed already completes inside strings                                                                                                                                                                                                 |
| `autoImportSpecifierExcludeRegexes: ["^(node:)?os$"]` (docs) | set by the extension for vtsls (Zed's default), typescript-language-server and the `arktype` server, through `language_server_additional_workspace_configuration` and `language_server_additional_initialization_options` in `src/arktype.rs` |

## Where Zed differs

- **Highlighting needs Zed to inject ArkType.** A Zed extension can't add injections to a language it doesn't define, and Zed rejects an extension language named like a built-in one (zed-industries/zed#65382, #8795). Library injections go in Zed's own `crates/grammars/src/{typescript,tsx,javascript}/injections.scm`, as `graphql`, `sql` and Lit's `svg` already do (zed-industries/zed#65509), so ArkType's go there too: zed-industries/zed#67445 appends [`ark/tree-sitter/queries/ecma/injections.scm`](../tree-sitter/queries/ecma/injections.scm) to all three. Svelte, Vue, Astro and Markdown code blocks reach it through their TypeScript layers. MDX parses its ESM itself, so `srazzak/zed-mdx`'s `languages/mdx/injections.scm` needs the same rules.
- **Zed's themes name two captures differently.** `writeQueries.ts` writes `languages/arktype/highlights.scm` from the shared one with `@none` as `@primary` (the editor's foreground in every theme Zed ships) and `@module` as `@namespace`, since Zed skips a capture its theme doesn't style.
- **Vue's bound attributes are highlighted.** VS Code's Vue grammar scopes `:title="type('string')"` as an HTML string, so ArkType isn't highlighted there; Zed's Vue extension injects TypeScript into it, so it is.
- **Inline errors are opt-in.** The `arktype` server replaces vtsls only where `language_servers` names it, and Zed's inline diagnostics are off by default (see the docs for both settings). The summary is the message's first line, so hovers and the diagnostics panel show it above TypeScript's full message, where VS Code shows only the full message.
- **No `followCursor`.** ErrorLens shows only the problem closest to the cursor; Zed shows one per line. `update_debounce_ms: 0` matches `errorLens.delay: 0`.
- **The excludes add to yours.** Zed unions extension configuration into the user's, so a user's own `autoImportSpecifierExcludeRegexes` keeps `^(node:)?os$` where VS Code's would replace it.

## Develop

`zed: install dev extension` and pick this directory. Zed builds `src/arktype.rs` with your `rustup` toolchain and clones the grammar from `[grammars.arktype]`. To try a local grammar, point `repository` at `file:///path/to/arktype` and `rev` at a commit with your change.

```sh
pnpm testFiles ark/zed/__tests__/*.test.ts # the proxy, ErrorLens's rules, vtsls end to end and highlighting parity
node ark/zed/writeQueries.ts # after changing ark/tree-sitter/queries/highlights.scm
node ark/zed/checkPackage.ts # package it as the registry does, in Docker
```

`parity.test.ts` checks highlighting against VS Code's TextMate grammar with [`ark/editor-conformance`](../editor-conformance). `conformance/` highlights its corpus the way Zed would: Zed's grammars and queries at the revisions it pins, with the upstream injections added, resolved by Zed's rules for which capture wins. Every way that differs from VS Code is listed with its reason in `ark/editor-conformance/highlighting/differences/zed.json`.

## Publish

1. If `ark/tree-sitter` changed since `[grammars.arktype] rev` in `extension.toml`, land the change on `main` and set `rev` to that commit.
2. Bump `version` in `extension.toml`, `Cargo.toml` and `package.json` together, and run `node ark/zed/checkPackage.ts`.
3. Install it as a dev extension and check highlighting, an inline `"number | strin"` and auto-import of `type`. The registry closes PRs for untested extensions.
4. Open a PR to [zed-industries/extensions](https://github.com/zed-industries/extensions) that adds the submodule and entry, then run `pnpm sort-extensions`:

   ```sh
   git submodule add https://github.com/arktypeio/arktype.git extensions/arktype
   ```

   ```toml title="extensions.toml"
   [arktype]
   submodule = "extensions/arktype"
   path = "ark/zed"
   version = "0.1.0"
   ```

5. For each later release, bump the submodule and `version` in the same file.

Highlighting also needs the injections in Zed itself (zed-industries/zed#67445) and in the MDX extension, whose `languages/mdx/injections.scm` in srazzak/zed-mdx needs `ark/tree-sitter/queries/ecma/injections.scm` appended.
