# arksets

Set algebra for arktype schemas: intersection, reduction, discrimination and JSON Schema generation.

A schema describes a set of values. Comparing two of those sets- intersecting them, deciding whether one is a subtype of another, telling the branches of a union apart- is the job of this package. `@ark/schema` defines what a set _is_ and how to test membership; `arksets` reasons about how sets _relate_.

Importing it installs a `SetEngine` on `$ark.sets`, which `@ark/schema` consults when it parses a node (to reduce it to canonical form), when it constructs a union (to discriminate its branches), whenever a relational method like `.and()`, `.extends()` or `.keyof()` is called, and to generate a JSON Schema with `.toJsonSchema()`:

```ts
import "arksets"
```

`arktype` imports it, so nothing changes for arktype users. Without it, `@ark/schema` still parses and validates- nodes are simply left unreduced, unions compile without a discriminant, and relational methods and `.toJsonSchema()` throw naming the missing import.
