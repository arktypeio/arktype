# @ark/json-schema

`jsonSchemaToType` parses a JSON Schema into an ArkType Type:

```ts
import { jsonSchemaToType } from "@ark/json-schema"

const T = jsonSchemaToType({ type: "string", minLength: 5, maxLength: 10 })

T.expression // "5 <= string <= 10"
```

To go the other way, you don't need this package. Every Type has `toJsonSchema()`:

```ts
import { type } from "arktype"

// { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string", maxLength: 10, minLength: 5 }
const schema = type("5 <= string <= 10").toJsonSchema()
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
import { jsonSchema } from "@ark/json-schema"

declare const userJson: object

const User = jsonSchema.as<{ name: string; age?: number }>(userJson)
```

The underlying types are exported as `jsonSchema.infer` and `jsonSchema.validate`.

## How it reads JSON Schema

`jsonSchemaToType` reads a schema with [`arksets`](https://github.com/arktypeio/arktype/tree/main/ark/sets)' `parse`, so the Type accepts exactly what a JSON Schema 2020-12 validator accepts, except that lengths count UTF-16 code units where JSON Schema counts code points (draft-07 forms are read too). `format` is an annotation, as the spec defaults to. Keywords that can't be read exactly, like a remote `$ref` or `unevaluatedProperties`, throw with their JSON Pointer.

## Docs

See [arktype.io/docs/json-schema](https://arktype.io/docs/json-schema) for:

- [From JSON Schema](https://arktype.io/docs/json-schema/from-json-schema): `jsonSchemaToType`, typing its result and `JsonSchemaScope`
- [Keyword support](https://arktype.io/docs/json-schema/support): which keywords are checked, which throw and which are ignored
- [To JSON Schema](https://arktype.io/docs/json-schema/to-json-schema): `toJsonSchema()` and its options
