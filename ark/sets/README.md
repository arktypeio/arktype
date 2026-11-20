# arksets

Internal. arksets is arktype's set algebra and the reader behind `fromJsonSchema`. It isn't published: `arktype` bundles it, and `@ark/aot` imports it from the workspace. Nothing here is a public API, and any of it can change in any release.

To read and compare schemas, use `arktype`: `fromJsonSchema` reads a JSON Schema or a Standard JSON Schema (e.g. zod) into a Type, and a Type's `.extends()`, `.equals()`, `.overlaps()`, `.and()`, `.or()` and `.toJsonSchema()` relate, combine and convert it. See [arktype.io/docs/json-schema/compare](https://arktype.io/docs/json-schema/compare).

## The engine

`arksets/internal` installs the algebra `@ark/schema` uses to reduce nodes and discriminate unions as they're parsed, and to implement `.toJsonSchema()` and relational methods like `.and()`, `.extends()` and `.keyof()`. arktype installs it as it loads.

Without it, `@ark/schema` parses and validates unreduced nodes and undiscriminated unions, and relational methods and `.toJsonSchema()` throw. Parsing a schema whose validation depends on reduction throws as well: a tuple that bounds its length, an unordered union with a transforming branch, an optional prop or a tuple's optional or defaultable element under `exactOptionalPropertyTypes: false`, or an index signature keyed by anything other than `string`, `symbol` or `string | symbol`.

See [arktype.io/docs/internals/sets](https://arktype.io/docs/internals/sets) for what works without it.

## Reading schemas

`parse(schema, options?)` (`formats.ts`) reads a Root, a Standard JSON Schema or a JSON Schema into a Root in an isolated scope; `fromJsonSchema` rebinds it to arktype's with `type()`. Its `io` option reads a Root's or a Standard Schema's output, and `root` is the document a JSON Schema's `#/...` refs resolve against. A Standard Schema's read is cached; a JSON Schema is plain data, so it's read on every call. The other exports of `index.ts` (`isSubset`, `intersect`, `discriminate`, ...) back this package's tests.

A Root read from a JSON Schema accepts exactly what a 2020-12 validator accepts, except that lengths count UTF-16 code units, with ajv as the tiebreaker. Every keyword applies, and a type's keywords constrain only that type, so `{ minimum: 5 }` accepts `"foo"`. draft-07 forms (`items` arrays, `additionalItems`, `definitions`, `dependencies`) are read too, and a `$schema` of draft-07 or earlier ignores a `$ref`'s siblings.

- `format` is an annotation, as the spec defaults to. arktype writes a `pattern` beside each format, so its JSON Schema reads back equal.
- A `pattern` may also be a `RegExp`, read with its own flags.
- A `$ref` that isn't a JSON Pointer into its document, `$dynamicRef`, `unevaluatedProperties` and `unevaluatedItems` throw with their JSON Pointer, as does a keyword whose value is invalid.

An arktype object can also be an array, and a JSON Schema object can't, so an arktype Root is compared by its own semantics; read its `.toJsonSchema()` to use JSON's. A Standard JSON Schema is read as the JSON Schema it writes, so what that can't express, like zod's refinements, transforms and `undefined`, is invisible to every relation.
