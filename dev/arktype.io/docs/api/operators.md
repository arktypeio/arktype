---
hide_table_of_contents: true
---

# Operators

## Operating Table

| operator     | string                        | tuple                                        | helper                                |
| ------------ | ----------------------------- | -------------------------------------------- | ------------------------------------- |
| arrayOf      | <code> "type[]" </code>       | ["arrayOf", &lt;object&gt;]                  | arrayOf(&lt;object&gt;)               |
| instanceOf   | <code>❌</code>               | ["instanceOf", &lt;object&gt;]               | instanceOf(&lt;object&gt;)            |
| valueOf      | <code>❌</code>               | ["===", value]                               | valueOf(&lt;object&gt;)               |
| keyOf        | <code>❌</code>               | ["keyOf", &lt;object&gt;]                    | keyOf(&lt;object&gt;)                 |
| keyof        | <code>❌</code>               | [keyof, &lt;object&gt;]                      | ❌                                    |
| morph        | <code>❌</code>               | [inputType, &vert;&gt;, (data) =&gt; output] | morph(inputType, (data) =&gt; output) |
| narrow       | <code>❌</code>               | ["type", =&gt; , condition]                  | ❌                                    |
| config       | <code>❌</code>               | ["type", ":", config]                        | ❌                                    |
| bound        | <code> "number&lt;5" </code>  | ❌                                           | ❌                                    |
| divisor      | <code> "type%divisor" </code> | ❌                                           | ❌                                    |
| union        | <code> "a&vert;b" </code>     | [a, &vert; , b]                              | union(a,b)                            |
| intersection | <code> "a&b" </code>          | [a, &, b]                                    | intersection(a,b)                     |
| node         | <code>❌</code>               | ["node", nodeDefinition]                     | type.from(nodeDefinition)             |
