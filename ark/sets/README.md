# arksets

Set algebra for arktype schemas: intersection, reduction, discrimination and JSON Schema generation.

```ts
import "arksets"
```

Importing it installs the algebra `@ark/schema` uses to reduce nodes and discriminate unions as they are parsed, to implement relational methods like `.and()`, `.extends()` and `.keyof()`, and to generate JSON Schema with `.toJsonSchema()`. `arktype` imports it.

Without it, `@ark/schema` parses and validates unreduced nodes and undiscriminated unions, and relational methods and `.toJsonSchema()` throw. Parsing a schema whose validation depends on reduction throws as well: a tuple, an unordered union with a transforming branch, an optional prop under `exactOptionalPropertyTypes: false`, or an index signature keyed by anything other than `string`, `symbol` or `string | symbol`.
