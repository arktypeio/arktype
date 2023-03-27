---
hide_table_of_contents: true
---

# Operators

## Operating Table

| operator                          | string                                                        | tuple                                                       | helper                                               |
| --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| [arrayOf](./arrayof.md)           | <code> "type[]" </code>                                       | <code> ["arrayOf", &lt;object&gt;] </code>                  | <code> arrayOf(&lt;object&gt;) </code>               |
| [instanceOf](./instanceof.md)     | <code>❌</code>                                               | <code> ["instanceOf", &lt;object&gt;] </code>               | <code> instanceOf(&lt;object&gt;) </code>            |
| [intersection](./intersection.md) | <code> "a&b" </code>                                          | <code> [a, &, b] </code>                                    | <code> intersection(a,b) </code>                     |
| [keyOf](./keyof.md)               | <code>❌</code>                                               | <code> ["keyOf", &lt;object&gt;] </code>                    | <code> keyOf(&lt;object&gt;) </code>                 |
| [morph](./morph.md)               | <code>❌</code>                                               | <code> [inputType, &vert;&gt;, (data) =&gt; output] </code> | <code> morph(inputType, (data) =&gt; output) </code> |
| [narrow](./narrow.md)             | <code>❌</code>                                               | <code> ["type", =&gt; , condition] </code>                  | <code>❌</code>                                      |
| [union](./union.md)               | <code> "a&vert;b" </code>                                     | <code> [a, &vert; , b] </code>                              | <code> union(a,b) </code>                            |
| [valueOf](./valueof.md)           | <code>❌</code>                                               | <code> ["===", value] </code>                               | <code> valueOf(&lt;object&gt;) </code>               |
| [config](./parseconfigtuple.md)   | <code>❌</code>                                               | <code> ["type", ":", config] </code>                        | <code>❌</code>                                      |
| [bound](./validatebound.md)       | <code> "[value?][comparitor?]type[comparitor][value]" </code> | <code>❌</code>                                             | <code>❌</code>                                      |
| [divisor](./validatedivisor.md)   | <code> "type%divisor" </code>                                 | <code>❌</code>                                             | <code>❌</code>                                      |
| [node](./infernode.md)            | <code>❌</code>                                               | <code> ["node", nodeDefinition] </code>                     | <code> type.from(nodeDefinition) </code>             |
