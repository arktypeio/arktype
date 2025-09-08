# @ark/json-schema

## What is it?

`@ark/json-schema` is a package that allows converting from a JSON Schema schema to an ArkType Type. For example:

```js
import { jsonSchemaToType } from "@ark/json-schema"

const T = jsonSchemaToType({ type: "string", minLength: 5, maxLength: 10 })
```

is equivalent to:

```js
import { type } from "arktype"

const T = type("5<=string<=10")
```

This enables easy adoption of ArkType for people who currently have JSON Schema based runtime validation in their codebase.

If you want to convert your existing ArkType `Type`s to JSON Schema, you don't need this library.

Instead, use the built-in `toJsonSchema()` method that exists on every `Type`, e.g.:

```ts
import { type } from "arktype"

// { type: "string", minLength: 5, maxLength: 10 }
const schema = type("5<=string<=10").toJsonSchema()
```

## Extra Type Safety

If you wish to ensure that your JSON Schema schemas are valid, you can do this too! Simply import the relevant `Schema` type from `@ark/json-schema` like so:

```ts
import type { JsonSchema } from "arktype"

const integerSchema: JsonSchema.Numeric = {
	type: "integer",
	multipleOf: "3" // errors stating that 'multipleOf' must be a number
}
```

Note that for string schemas exclusively, you must import the schema type from `@ark/json-schema` instead of `arktype`. This is because `@ark/json-schema` doesn't yet support the `format` keyword whilst `arktype` does.

```ts
import type { StringSchema } from "@ark/json-schema"
const stringSchema: StringSchema = {
	type: "string",
	minLength: "3" // errors stating that 'minLength' must be a number
}
```

## Limitations

- No `dependencies` support
- No `if`/`else`/`then` support
- `multipleOf` only supports integers
