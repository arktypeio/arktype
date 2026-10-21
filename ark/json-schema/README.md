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

## Type Safety

`jsonSchema` validates a schema as you write it and infers the type it describes. At runtime, it returns its input unchanged.

```ts
import { jsonSchema } from "@ark/json-schema"

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

// TypeScript: minLength must be a non-negative integer (was -1)
jsonSchema({ type: "string", minLength: -1 })
```

`jsonSchemaToType` checks and infers its input the same way.

A schema TypeScript can't see as a literal, like one read from a `.json` file, can be cast with `jsonSchema.as`:

```ts
const User = jsonSchema.as<{ name: string; age?: number }>(userJson)
```

The underlying types are exported as `jsonSchema.infer` and `jsonSchema.validate`.

## How it reads JSON Schema

`jsonSchemaToType` reads a schema with [`arksets`](https://github.com/arktypeio/arktype/tree/main/ark/sets)' `parse`, so the Type accepts exactly what a JSON Schema 2020-12 validator accepts (draft-07 forms are read too). `format` is an annotation, as the spec defaults to. Keywords that can't be read exactly, like a remote `$ref` or `unevaluatedProperties`, throw with their JSON Pointer.

## Docs

See [arktype.io/docs/json-schema](https://arktype.io/docs/json-schema) for:

- [From JSON Schema](https://arktype.io/docs/json-schema/from-json-schema): `jsonSchemaToType`, typing its result and `JsonSchemaScope`
- [Keyword support](https://arktype.io/docs/json-schema/support): which keywords are checked, which throw and which are ignored
- [To JSON Schema](https://arktype.io/docs/json-schema/to-json-schema): `toJsonSchema()` and its options
