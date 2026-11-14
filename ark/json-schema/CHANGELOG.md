# @ark/json-schema

## Unreleased

### Install `@ark/json-schema`, not `@arktype/json-schema`

`@arktype/json-schema`, which published the same package, is no longer published.

### Take `arktype` as a peer dependency

`arktype` was a dependency at an exact version, so an app on any other version installed a second copy, and errors from a Type `jsonSchemaToType` returned weren't `instanceof` its `type.errors`. It's now a peer dependency at the version released with it, so the Type comes from the app's own `arktype`, and a mismatched version fails to install (npm) or warns (pnpm) rather than installing a second copy.

### Infer types from JSON Schema

`jsonSchema` checks a schema as you write it and infers the type it describes, and `jsonSchemaToType` returns a `Type` of that type (#729).

```ts
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"

const User = jsonSchema({
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "integer", minimum: 0 }
	},
	required: ["name"]
})

// { name: string; age?: number }
type User = typeof User.infer

// Type<{ name: string; age?: number }>
const T = jsonSchemaToType(User)

// TypeScript: minLength must be a non-negative integer (was -1)
jsonSchema({ type: "string", minLength: -1 })
```

Inference follows `$ref`s, including recursive ones, composition, conditionals and `not`, and resolves `$defs`, `definitions` and OpenAPI `components.schemas`. An inferred type may be wider than the schema, since constraints like `minimum` and `pattern` don't narrow it, but it never rejects a value the schema accepts. A keyword `jsonSchemaToType` can't read, like `unevaluatedProperties`, `$dynamicRef` or a draft-04 boolean `exclusiveMinimum`, is a type error. At runtime, `jsonSchema` returns its input.

A schema TypeScript can't see as a literal, like one read from a `.json` file, can be cast with `jsonSchema.as<t>()`. `jsonSchema.infer` and `jsonSchema.validate` are the underlying types, for writing your own wrappers.

Thanks to @TizzySaurus, who built this package and kicked off inference in #1592.

### Resolve `$ref`s to anchors and embedded `$id`s

A `$ref` resolves like a URI against the `$id` of the resource it's in, so it can name an anchor or another resource in the same document, where it threw.

```ts
const T = jsonSchemaToType({
	$ref: "#name",
	$defs: { name: { $anchor: "name", type: "string" } }
})

// was: throws
// now: string
T.expression
```

A pointer like `#/$defs/a` within a nested `$id` resolves against that resource, where it threw, and within a draft-04 `id`, where it was read against the document. A `$ref` to another document still throws.

### Read JSON Schema as exactly the values a validator accepts

`jsonSchemaToType` reads a schema as exactly the values a 2020-12 validator like ajv accepts, or throws where it can't, and reads draft-07 forms. Lengths count UTF-16 code units, where JSON Schema counts code points. Schemas that threw now read, and some that read were wrong:

- `prefixItems` and draft-07 `items` arrays make their elements optional, as JSON Schema does: `[string?, number?, ...unknown[]]`.
- `{ type: "object" }` no longer allows arrays, which its Type's `expression` says: `{ foo: string } & isNonArray`.
- A type's keywords constrain only that type, so `{ minimum: 5 }` allows `"foo"`.
- `minimum` beside `exclusiveMinimum`, `required` without `properties`, and `propertyNames` beside `patternProperties` read rather than throw.
- Composition keywords apply together, where only the first of `allOf`, `anyOf`, `not` and `oneOf` did, and `oneOf` with disjoint branches is a union.
- `$ref` (including recursive refs), `if`/`then`/`else`, `dependentRequired` and `dependentSchemas` are read (#1485).
- A fractional `multipleOf`, which threw, is read, and draft-07 `dependencies`, which were ignored, apply.
- An invalid keyword, or one that can't be read exactly like `unevaluatedProperties` or a remote `$ref`, throws a `ParseError` naming its JSON Pointer, like `#/minLength must be a non-negative integer (was -1)`, where some threw a `TraversalError`.
- The `writeJsonSchema*Message` functions and their types, like `writeJsonSchemaInsufficientKeysMessage`, are no longer exported, since the errors they wrote are no longer thrown.

A `uniqueItems` error no longer lists the duplicate items: it reads `must be an array of unique items (was an array)`, where it read `(was an array with 2 duplicates: 1, and 3)`.

### Accept a `StringSchema` in `jsonSchemaToType`

`jsonSchemaToType`'s parameter accepts a `StringSchema`, whose `pattern` may be a `RegExp`, as it already did at runtime.

## 0.0.1

### Initial Release

Released the initial implementation of the package.
