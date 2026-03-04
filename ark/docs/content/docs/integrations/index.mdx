---
title: Integrations
---

### Standard Schema

ArkType is proud to support and co-author the new [Standard Schema](https://github.com/standard-schema/standard-schema) API with [Valibot](https://github.com/fabian-hiller/valibot) and [Zod](https://github.com/colinhacks/zod).

Standard Schema allows you and your dependencies to integrate library-agnostic validation logic. If you're building or maintaining a library with a peer dependency on ArkType and/or other validation libraries, we'd recommend consuming it through Standard Schema's API if possible so that your users can choose the solution that best suits their needs!

#### As definitions

Any Standard Schema compliant validator can also be passed directly to `type`, either at the top level or nested inside a structural definition, and will be fully inferred and validated:

```ts
// @noErrors
import { type } from "arktype"
const v = { number: () => "number" as const }
const z = {
	string: () => "string" as const,
	object: <shape extends Record<string, unknown>>(shape: shape) => shape
}

const ZodAddress = z.object({
	street: z.string(),
	city: z.string()
})

const User = type({
	name: "string",
	age: v.number(),
	address: ZodAddress
})
```

This makes ArkType a universal composition layer- mix and match validators from any ecosystem in a single definition.

### JSON Schema

ArkType supports bidirectional conversion with JSON Schema.

#### Type to JSON Schema

Every Type instance has a [`toJsonSchema()` method](/docs/type-api#tojsonschema) that generates a corresponding JSON Schema. See the [configuration docs](/docs/configuration#tojsonschema) for options including draft targets, fallback handlers, and cyclic type support.

#### JSON Schema to Type

The `@ark/json-schema` package converts JSON Schema directly into ArkType Types:

```ts
// @noErrors
declare const jsonSchemaToType: (schema: unknown) => unknown

const User = jsonSchemaToType({
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "integer", minimum: 0 }
	},
	required: ["name"]
})
// Type<{ name: string; age?: number }>
```

See the [`@ark/json-schema` README](https://github.com/arktypeio/arktype/tree/main/ark/json-schema) for more details and limitations.

### tRPC

ArkType can easily be used with tRPC:

```ts
// @noErrors
// trpc >= 11 accepts a Type directly
t.procedure.input(
	type({
		name: "string",
		"age?": "number"
	})
)

// tRPC < 11 accepts the `.assert` prop
t.procedure.input(
	type({
		name: "string",
		"age?": "number"
	}).assert
)
```

### drizzle

Drizzle maintains an official [`drizzle-arktype` package](https://orm.drizzle.team/docs/arktype) that can be used to create Types for your Drizzle schemas.

```ts
// @noErrors
import { pgTable, text, integer } from "drizzle-orm/pg-core"
import { createSelectSchema } from "drizzle-arktype"

const users = pgTable("users", {
	id: integer().generatedAlwaysAsIdentity().primaryKey(),
	name: text().notNull(),
	age: integer().notNull()
})

// Type<{ id: number; name: string; age: number }>
const User = createSelectSchema(users)
```

### react-hook-form

react-hook-form has built-in support for ArkType via [`@hookform/resolvers`](https://github.com/react-hook-form/resolvers/tree/master):

```ts
// @noErrors
import { useForm } from "react-hook-form"
import { arktypeResolver } from "@hookform/resolvers/arktype"
import { type } from "arktype"

const User = type({
	firstName: "string",
	age: "number.integer > 0"
})

// in your component
const {
	register,
	handleSubmit,
	formState: { errors }
} = useForm({
	resolver: arktypeResolver(User)
})
```

For a custom controlled input, you can pass the inferred type into the hook itself:

```ts
// @noErrors
useForm<typeof User.infer>(/*...*/)
```

### hono

Hono has built-in support for ArkType via [`@hono/arktype-validator`](https://github.com/honojs/middleware/tree/main/packages/arktype-validator):

```ts
// @noErrors
const User = type({
	name: "string",
	age: "number"
})

app.post("/author", arktypeValidator("json", User), c => {
	const data = c.req.valid("json")
	return c.json({
		success: true,
		message: `${data.name} is ${data.age}`
	})
})
```

[`hono-openapi`](https://github.com/rhinobase/hono-openapi) also offers experimental support for OpenAPI docgen.

### oRPC

[oRPC](https://orpc.unnoq.com/) has built-in support for Standard Schema, so ArkType works seamlessly right out of the box:

```ts
// @noErrors
os.input(
	type({
		name: "string",
		"age?": "number"
	})
)
```
