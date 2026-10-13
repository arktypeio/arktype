---
name: arktype
description: Write, review or debug runtime validation with ArkType (the `arktype` package). Use when code imports from "arktype", when a TypeScript project needs to validate untrusted input like request bodies, env vars, JSON, config files or form data, or when converting schemas from Zod, Yup, Valibot or io-ts to ArkType.
---

# ArkType

ArkType definitions are TypeScript type syntax, written as strings and objects, that also validate at runtime. If you know the TypeScript type, write that.

Full docs as Markdown: https://arktype.io/llms.txt. Any docs page is also available as Markdown by adding `.md` to its URL, e.g. https://arktype.io/docs/objects.md.

## Define, infer, validate

```ts
import { type } from "arktype"

const User = type({
	name: "string",
	email: "string.email",
	"age?": "number.integer >= 0",
	role: "'admin' | 'member'",
	tags: "string[]"
})

// the TypeScript type, derived from the definition
type User = typeof User.infer

const out = User(JSON.parse(body))

if (out instanceof type.errors) {
	// every problem, one per line, e.g. `email must be an email address (was "x")`
	console.error(out.summary)
} else {
	// out is narrowed to User
	console.log(out.name)
}
```

- Calling a type returns the validated data or an `ArkErrors` instance. It does not throw, so check with `instanceof type.errors` rather than wrapping it in `try`/`catch`.
- `User.assert(data)` throws instead, for places where invalid data is a bug.
- Name types in PascalCase (`User`). Name types that transform their input in camelCase (`parseUser`), since they behave like functions.
- `typeof User.infer` is the output type. `typeof User.inferIn` is the input type, which differs once a type transforms its input.

## Syntax

Strings use TypeScript's operators. Write string literals in single quotes inside the definition.

| Want                   | Write                                                     |
| ---------------------- | --------------------------------------------------------- |
| optional key           | `"key?": "string"`                                        |
| default (objects only) | `count: "number = 0"`                                     |
| union                  | `"string \| number"`, `"'a' \| 'b'"`                      |
| array                  | `"string[]"`, `"(string \| number)[]"`                    |
| tuple                  | `["string", "number"]`                                    |
| number range           | `"number > 0"`, `"0 <= number < 1"`                       |
| string or array length | `"string > 0"`, `"1 <= string <= 255"`, `"string[] >= 1"` |
| divisibility           | `"number % 2"`                                            |
| regex                  | `"/^[a-z]+$/"`                                            |
| record                 | `"Record<string, number>"` or `{ "[string]": "number" }`  |
| class instance         | `"Date"`, `"Map"`, or `type.instanceOf(MyClass)`          |
| enum from values       | `type.enumerated("a", "b")` or `type.valueOf(MyEnum)`     |

Common keywords: `string.email`, `string.uuid`, `string.url`, `string.ip`, `string.semver`, `string.date.iso`, `string.alphanumeric`, `number.integer`, `number.safe`, `number.epoch`. The full list is at https://arktype.io/docs/keywords.md.

## Composing types

Put an existing type anywhere a definition goes. Don't call `type()` again on nested objects; plain objects are already definitions.

```ts
const Address = type({ city: "string", zip: "string" })

const Customer = type({
	name: "string",
	address: Address,
	"previous?": Address.array()
})

const Admin = Customer.and({ permissions: "string[]" })
const MaybeCustomer = Customer.or("null")
const CustomerName = Customer.pick("name")
const CustomerDraft = Customer.partial()
```

Never interpolate a type into a string, as in ``type(`${Address}[]`)``. Use `Address.array()`, `Address.or(...)` and the other chained methods, or a tuple expression like `[Address, "[]"]`.

## Parsing and transforming

Keywords ending in `.parse` transform their input. `.to()` validates the parsed result, and `.pipe()` runs your own function.

```ts
// "8080" -> 8080, then checked as a port
const parsePort = type("string.integer.parse").to("0 < number <= 65535")

// a JSON string -> a validated object
const parsePayload = type("string.json.parse").to({ id: "number.integer" })

// any function, after validation
const parseTrimmed = type("string").pipe(s => s.trim())

// env vars arrive as strings, so parse them and give defaults
const Env = type({
	DATABASE_URL: "string.url",
	PORT: type("string.integer.parse").default("3000"),
	"DEBUG?": "'true' | 'false'"
})
```

Other morph keywords: `string.trim`, `string.lower`, `string.upper`, `string.numeric.parse`, `string.date.parse`, `string.date.iso.parse`, `string.url.parse`.

## Custom rules

Use `.narrow()` when a rule involves more than one value. Return `true` to accept, or `ctx.reject()` to give a message and a path.

```ts
const Signup = type({
	password: "string >= 8",
	confirmPassword: "string"
}).narrow(
	(data, ctx) =>
		data.password === data.confirmPassword ||
		ctx.reject({
			expected: "identical to password",
			actual: "",
			path: ["confirmPassword"]
		})
)
```

## Recursive and cyclic types

Use a scope, where definitions can reference each other by name.

```ts
import { scope } from "arktype"

const types = scope({
	TreeNode: {
		value: "number",
		children: "TreeNode[]"
	}
}).export()

const tree = types.TreeNode({ value: 1, children: [] })
```

Don't wrap definitions inside a scope with `type()`. They're resolved within the scope, and `type()` would resolve them globally.

## Extra keys

By default, keys a definition doesn't declare are allowed and left in the output. To reject or remove them for one object, use `"+"`:

```ts
const Strict = type({ "+": "reject", name: "string" })
const Stripped = type({ "+": "delete", name: "string" })
```

## Integrations

- ArkType types are [Standard Schema](https://standardschema.dev), so they work directly with tRPC, oRPC, Hono and other libraries that accept one. react-hook-form takes them through `arktypeResolver` from `@hookform/resolvers/arktype`.
- `User.toJsonSchema()` returns the equivalent JSON Schema.
- Global configuration (error messages, `onUndeclaredKey`, and so on) goes in a file imported from `arktype/config` before anything imports `arktype`. See https://arktype.io/docs/configuration.md.

## Mistakes to avoid

- Defaults like `"number = 0"` only work as object values or tuple elements, not as a standalone `type("number = 0")`.
- An optional key can be missing, but not present with the value `undefined`, mirroring TypeScript's `exactOptionalPropertyTypes`. Write `"key?": "string | undefined"` to allow both.
- A string literal needs its own quotes inside the definition: `"'a' | 'b'"`. A bare `"a"` is read as the name of a type, and fails to resolve.
- Don't hand-write a TypeScript interface next to the type. Derive it with `typeof T.infer`, so the two can't drift.
- An invalid definition is a TypeScript error at the definition itself, with a message saying what's wrong. Fix it there rather than casting it away.
