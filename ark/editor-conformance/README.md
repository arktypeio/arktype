# @ark/editor-conformance

The spec every ArkType editor integration is checked against, so Zed, Neovim, Helix and JetBrains behave 1:1 with the VS Code extension (`ark/extension`). Nothing here is written by hand that could be derived: highlighting expectations come from running VS Code's own TextMate engine on the extension's grammar, and diagnostic expectations from TypeScript's own messages passed through ErrorLens's rules.

## Highlighting

| Path                                     | What it is                                                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `highlighting/corpus/`                   | Fixtures in every host the extension injects into: `.ts`, `.tsx`, `.js`, `.jsx`, `.mdx`, `.svelte`, `.vue`, `.astro`, `.md`. `scratch.ts` is a verbatim copy of `ark/extension/arktype.scratch.ts`. |
| `highlighting/expected/<file>.json`      | The oracle's output for each fixture. `_oracle.json` pins the engine, the host grammars (`@shikijs/langs`) and the injection, by hash.                                                              |
| `highlighting/categories.json`           | How a TextMate scope stack becomes a category: walk from the innermost scope out, first rule whose prefix matches wins, else `none`. Categories are tree-sitter capture names.                      |
| `highlighting/differences/<target>.json` | Each target's accepted differences from the oracle, every one with a reason, and the fixtures it can't run.                                                                                         |

`oracle.ts` tokenizes each fixture twice with `vscode-textmate` + Oniguruma, the engine VS Code uses: with the host grammar alone, and with `injected.tmLanguage.json` registered the way `contributes.grammars[].injectTo` registers it. A span is

```ts
{
	;(line, column, length, text, category, region, baseCategory, scopes)
}
```

with 0-based lines and UTF-16 columns, covering a run of non-whitespace characters that share a category. `region: "text"` spans cover every character the host grammar puts in a string or comment, where ArkType highlighting happens. `region: "code"` spans cover the other characters the extension recolors (a callee's prefix losing its color, a key's colon), which a target may skip. `baseCategory` is the category without the extension.

### Checking a target

A target dumps, for each fixture, the characters its ArkType support styles (its own layer, not the host's colors) in the same span format, then:

```sh
node ark/editor-conformance/highlighting/check.ts --target <name> --actual <dir>
```

Where the extension changes a character's category the target must style it the same; elsewhere it must leave it alone or style it the same. `--code` adds the `code` region. A mismatch not listed in `differences/<target>.json`, a listed one that no longer occurs, a difference without a reason, or a fixture with no output that isn't listed as skipped all fail. `--write-differences` writes the current mismatches, keeping existing reasons.

The tree-sitter grammar's target (`ark/tree-sitter`) has 20 differences in 8 classes, all from TextMate matching lines with regexes where tree-sitter parses: a space between a callee and `(`, escaped quotes inside a definition, text before a callee that TextMate's begin pattern swallows, `regex("a" + "b")`, and calls written inside plain strings.

## Diagnostics

| Path                       | What it is                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnostics/rules.json`   | The extension's five `errorLens.replace` rules and the semantics ErrorLens v3.30.0 applies them with.                                                    |
| `diagnostics/cases.json`   | `{ name, origin, source?, input, output, rule, display }` for each case: real TypeScript diagnostics from `sources/` and edge cases from `synthetic.ts`. |
| `diagnostics/errorLens.ts` | A reference implementation: `rewrite(message)` and `display(message)`.                                                                                   |

`input` is the message as VS Code's TypeScript extension reports it (chains flattened with `\n`), `output` what the rules turn it into, `rule` the index that matched (`null` for none) and `display` what ErrorLens draws with its defaults (line breaks as `⏎`, cut at 500 characters).

## Regenerating

```sh
node ark/editor-conformance/highlighting/oracle.ts   # after changing the corpus or the extension's grammar
node ark/editor-conformance/diagnostics/generate.ts  # after changing sources/, synthetic.ts or the rules
```

`__tests__/conformance.test.ts` fails when either is stale.
