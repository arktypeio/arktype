# tree-sitter-arktype

ArkType's official tree-sitter grammar, for editors other than VS Code. It highlights ArkType definitions the way the VS Code extension's TextMate grammar does, and is tested against it character by character (see `ark/editor-conformance`).

A host language injects two kinds of range into `arktype`:

- the `arguments` of a definition call: `type(...)`, `generic`, `scope`, `define`, `match`, `fn`, `module`, `ark*`/`Ark*`, those names as methods (`$.type(...)`), and the 14 chained methods (`.and`, `.or`, `.case`, `.in`, `.extends`, `.ifExtends`, `.intersect`, `.merge`, `.exclude`, `.extract`, `.overlaps`, `.subsumes`, `.to`, `.satisfies`)
- the first string argument of `regex(...)`

The grammar lexes an argument list the way TextMate's rules do: objects, tuples and quoted strings are ArkType definitions at any depth, while parentheses, ternaries and function bodies are TypeScript, whose strings stay plain. Inside a definition it classifies words, operators, numbers, generics and regex literals as TextMate does, including where that disagrees with ArkType's own parser. `src/scanner.c` answers the one thing a grammar can't: whether a quote or `/` closes later on the same line, which decides whether TextMate treats it as a definition.

## Files

| Path                          | What it is                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grammar.js`, `src/scanner.c` | The grammar. `src/` is generated; `tree-sitter-arktype.wasm` is built from it.                                                                                       |
| `queries/highlights.scm`      | Captures for definition internals only; the host highlights everything else. No node has two captures, so editors that differ on which pattern wins agree.           |
| `queries/ecma/injections.scm` | One injection query for the `typescript`, `tsx` and `javascript` grammars. Markdown, Svelte, Vue, Astro and MDX reach it through their own TypeScript injections.    |
| `helix/`                      | `languages.toml` and `runtime/queries` for Helix, generated from the queries above.                                                                                  |
| `test/`                       | A layered highlighter on `web-tree-sitter` (`layers.ts`) and the conformance target built on it (`target.ts`), which editor integrations reuse with their own hosts. |

## Editors

- **Neovim**: `ark/neovim` registers the parser and extends each host's injections with `queries/ecma/injections.scm`.
- **Zed**: `ark/zed` provides the `arktype` language; Zed only lets a host's own `injections.scm` inject a language, so the patterns in `queries/ecma/injections.scm` go into Zed's TypeScript, TSX and JavaScript queries.
- **Helix**: append `helix/languages.toml` to `~/.config/helix/languages.toml`, copy `helix/runtime/queries` into `~/.config/helix/runtime/queries`, then run `hx --grammar fetch && hx --grammar build`. Helix themes have no default-foreground scope, so the few characters TextMate leaves unscoped inside a definition keep the string color (`differences/helix.json`).

## Developing

```sh
pnpm --filter tree-sitter-arktype buildGrammar   # after editing grammar.js or src/scanner.c
node ark/tree-sitter/scripts/writeHelix.ts        # after editing queries/
node ark/tree-sitter/test/dump.ts <dir>           # this target's spans, for check.ts or by hand
pnpm testFiles ark/tree-sitter/__tests__/parity.test.ts
```

`buildGrammar` needs the `tree-sitter` binary that `tree-sitter-cli` downloads when installed; `tree-sitter build --wasm` fetches a WASI SDK on first use. The tests fail when `src/`, the `.wasm` or `helix/` are stale, when highlighting differs from the oracle in a way `differences/tree-sitter.json` or `differences/helix.json` doesn't list, and when a node gets two captures.
