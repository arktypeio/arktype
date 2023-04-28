---
hide_table_of_contents: true
---

# Operators

## Operating Table

| operator                      | string                                                     | tuple                                    | helper                             |
| ----------------------------- | ---------------------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| [arrayOf](./arrayof.md)       | "T[]"                                                      | [T, "[]"]                                | arrayOf(T)                         |
| [instanceOf](./instanceof.md) |                                                            | ["instanceOf", T]                        | instanceOf(T)                      |
| [&](./intersection.md)        | "L&R"                                                      | [L, "&", R]                              | intersection(L,R)                  |
| [keyOf](./keyof.md)           |                                                            | "["keyOf", T]"                           | keyOf(T)                           |
| [&vert;>](./morph.md)         |                                                            | [inputType, "&vert;>", (data) => output] | morph(inputType, (data) => output) |
| [=>](./narrow.md)             |                                                            | ["type", "=>" , condition]               |                                    |
| [&vert;](./union.md)          | "L&vert;R"                                                 | [L, "&vert;" , R]                        | union(L,R)                         |
| [===](./valueof.md)           |                                                            | ["===", T]                               | valueOf(T)                         |
| [:](./parseconfigtuple.md)    |                                                            | ["type", ":", config]                    |                                    |
| [bound](./validatebound.md)   | "N<S<N", with comparators restricted to < or <=            |                                          |                                    |
| [%](./validatedivisor.md)     | "N%D", where "N" is a number and "D" is a non-zero integer |                                          |                                    |
| [node](./resolvednode.md)     |                                                            | ["node", nodeDefinition]                 | type.from(nodeDefinition)          |
