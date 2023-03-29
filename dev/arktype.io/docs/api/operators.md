---
hide_table_of_contents: true
---

# Operators

## Operating Table

| operator                      | string                                                                        | tuple                                                       | helper                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| [arrayOf](./arrayof.md)       | <code> "T[]" </code>                                                          | <code> [T, "[]"] </code>                                    | <code> arrayOf(&lt;object&gt;) </code>                                  |
| [instanceOf](./instanceof.md) | <code></code>                                                                 | <code> ["instanceOf", &lt;object&gt;] </code>               | <code> instanceOf(&lt;object&gt;) </code>                               |
| [&](./intersection.md)        | <code> "L&R" </code>                                                          | <code> [L, "&", R] </code>                                  | <code> intersection(L,R) </code>                                        |
| [keyOf](./keyof.md)           | <code></code>                                                                 | <code> "["keyOf", &lt;object&gt;]" </code>                  | <code> "keyOf(&lt;object&gt;)" </code>                                  |
| [&vert;&gt;](./morph.md)      | <code></code>                                                                 | <code> [inputType, &vert;&gt;, (data) =&gt; output] </code> | <code> morph(inputType, (data) =&gt; output) </code>                    |
| [=&gt;](./narrow.md)          | <code></code>                                                                 | <code> ["type", =&gt; , condition] </code>                  | <code>const isEven = (x: unknown): x is number =&gt; x % 2 === 0</code> |
| [&vert;](./union.md)          | <code> "L&vert;R" </code>                                                     | <code> [L, "&vert;" , R] </code>                            | <code> union(L,R) </code>                                               |
| [===](./valueof.md)           | <code></code>                                                                 | <code> ["===", value] </code>                               | <code> valueOf(&lt;object&gt;) </code>                                  |
| [:](./parseconfigtuple.md)    | <code></code>                                                                 | <code> ["type", ":", config] </code>                        | <code></code>                                                           |
| [bound](./validatebound.md)   | <code> "N&lt;S&lt;N", with comparators restricted to &lt; or &lt;= </code>    | <code></code>                                               | <code></code>                                                           |
| [%](./validatedivisor.md)     | <code> "N%D", where \`N\` is a number and \`D\` is a non-zero integer </code> | <code></code>                                               | <code></code>                                                           |
| [node](./resolvednode.md)     | <code></code>                                                                 | <code> ["node", nodeDefinition] </code>                     | <code> type.from(nodeDefinition) </code>                                |
