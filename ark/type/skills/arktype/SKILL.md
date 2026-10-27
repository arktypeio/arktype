---
name: arktype
description: Write, review or debug runtime validation in TypeScript with ArkType (the `arktype` package), precompile it with `@ark/aot`, or migrate to it. Use when code imports from "arktype" or "@ark/aot"; when a TypeScript project needs to validate or parse untrusted data, like API request bodies, route handlers, form data, query params, env vars, JSON, config files, webhooks or LLM tool inputs; when adding a schema or validator; when setting up precompiled validation or fixing an error from `[plugin arktype]` or `arktype-precompile`; or when converting schemas from Zod, Valibot, TypeBox, Yup, Joi, Effect Schema or JSON Schema, e.g. "migrate this project from Zod to ArkType".
---

# ArkType

ArkType definitions are TypeScript type syntax, written as strings and objects, that also validate at runtime. If you know the TypeScript type, write that.

## Migrating a project

Migrating from Zod, Valibot, TypeBox, Yup, Joi, Effect Schema or JSON Schema? Read [references/migrating.md](references/migrating.md) first and follow its steps. It has the workflow, a table for each library and the defaults that differ. In short: rewrite each schema where it is, under the same name; keep what it accepts, rejects and returns identical; keep the code free of casts and `any`; before removing Zod, compare the schemas the tests don't cover with their originals on the same inputs, all of them if there's no `test` script; swap packages with the project's package manager; and run the `typecheck` and `test` scripts until both pass, without changing what a test expects. If asked to precompile too, set it up last, as [references/precompile.md](references/precompile.md) says.

## Precompiling

A project whose bundler config uses `@ark/aot` (e.g. `precompile.vite()` from `@ark/aot/unplugin`) constructs every Type at build time and replaces it with a standalone validator, so arktype's parser doesn't ship. To set it up, to add validation to such a project or to fix a build error from it, read [references/precompile.md](references/precompile.md): it has the setup for each bundler, Next.js and test runner, how to write definitions the build accepts, and each build error with its fix. In short:

- Define Types from static values, and compose them inside definitions, like `const Admin = User.and({ role: "'admin'" })`. A definition reading a parameter, or a function calling `.or`, `.pick` or another composing method at runtime, fails the build. To reuse a pattern, define a Generic.
- Define Types in JavaScript or TypeScript modules. A Svelte component's script isn't precompiled, so one importing arktype fails the build: put the Types, and any code checking a result against `type.errors`, in a `.ts` module the component imports.
- If the project calls `configure()`, name its module as `config` under `precompile` in an `ark.json` beside `package.json`, which the plugin, the test drivers, the CLI and the ESLint rule all read.
- A build error names the file, line and column, then why, then the fix on its last line. Apply that fix. Don't set `allowUnsafe` or switch to `runtime: "arktype"` to get past one. `npx arktype-precompile --check "src/**/*.ts"` lists every one without bundling.
- A validator's error messages say what failed but not what the value was, like `name must be a string`.
- A validator has no JSON Schema unless the `members` option asks for it. Where a library derives one from a Type itself, like the MCP SDK or the AI SDK, set `"members": { "~standard.jsonSchema": true }` under `precompile` in `ark.json`, or the library reads `undefined` in production.

Docs index: https://arktype.io/llms.txt, which links each page's Markdown. Any docs page is available as Markdown by adding `.md` to its URL, e.g. https://arktype.io/docs/objects.md. Every page in one file: https://arktype.io/llms-full.txt.

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

// e.g. a request body
declare const body: string

const out = User(JSON.parse(body))

if (out instanceof type.errors) {
	// every problem, one per line, e.g. `email must be an email address`
	console.error(out.summary)
} else {
	// out is narrowed to User
	console.log(out.name)
}
```

- Calling a type returns the validated data or an `ArkErrors` instance. It does not throw, so check with `instanceof type.errors` rather than wrapping it in `try`/`catch`.
- `ArkErrors` is not an array. Read individual errors from `out.issues`, e.g. `out.issues[0]` or `out.issues.map(e => e.message)`, each with a `path`, `code` and `message`.
- `User.assert(data)` throws instead, for places where invalid data is a bug.
- Name types in PascalCase (`User`). Name types that transform their input in camelCase (`parseUser`), since they behave like functions.
- `typeof User.infer` is the output type. `typeof User.inferIn` is the input type, which differs once a type transforms its input or has defaults.

## Syntax

Strings use TypeScript's operators. Write string literals in single quotes inside the definition. Object types don't go in strings: `"{ a: string }"` doesn't parse, so write objects as objects and name them in a scope to reuse them in a string.

| Want                   | Write                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| optional key           | `"key?": "string"`                                                  |
| default (objects only) | `count: "number = 0"`, `plan: "'free' \| 'pro' = 'free'"`           |
| union                  | `"string \| number"`, `"'a' \| 'b'"`                                |
| array                  | `"string[]"`, `"(string \| number)[]"`                              |
| tuple                  | `["string", "number"]`                                              |
| number range           | `"number > 0"`, `"0 <= number < 1"`, `"1 <= number.integer <= 100"` |
| string or array length | `"string > 0"`, `"1 <= string <= 255"`, `"string[] >= 1"`           |
| divisibility           | `"number % 2"`                                                      |
| regex                  | `/^\d+$/` as a RegExp, or `"/^\\d+$/"` in a string                  |
| record                 | `"Record<string, number>"` or `{ "[string]": "number" }`            |
| class instance         | `"Date"`, `"Map"`, or `type.instanceOf(MyClass)`                    |
| enum from values       | `type.enumerated("a", "b")` or `type.valueOf(MyEnum)`               |
| array of a Type        | `Item.array()`, `Item.array().atLeastLength(1)`                     |
| custom error message   | `type("string >= 8").configure({ message: "Too short" })`           |

A regex with flags, like `/^a$/i`, must be a RegExp. Bounds bind tighter than `|`, so `"string <= 500 | null"` is a string of at most 500 characters, or null.

Common keywords: `string.email`, `string.uuid`, `string.url`, `string.ip`, `string.semver`, `string.date.iso`, `string.alphanumeric`, `number.integer`, `number.safe`, `number.epoch`. The full list is at https://arktype.io/docs/keywords.md.

## From Zod

What a Zod schema becomes. To migrate a project, follow [references/migrating.md](references/migrating.md), which has every library and the defaults that differ, like Zod removing undeclared keys where ArkType keeps them.

| Zod                                       | ArkType                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `z.object({ ... })`                       | `type({ ... })`                                                |
| `z.string().min(1).max(100)`              | `"1 <= string <= 100"`                                         |
| `z.string().email()`, `.url()`, `.uuid()` | `"string.email"`, `"string.url"`, `"string.uuid"`              |
| `z.number().int().positive()`             | `"number.integer > 0"`                                         |
| `z.enum(["a", "b"])`                      | `"'a' \| 'b'"`                                                 |
| `.optional()`, `.nullable()`              | `"key?": "T \| undefined"`, `"T \| null"`                      |
| `.default(x)`                             | `key: "T = x"` or `key: T.default(x)`                          |
| `z.array(T).min(1)`                       | `T.array().atLeastLength(1)`, or `"string[] >= 1"` in a string |
| `z.union([A, B])`, `z.discriminatedUnion` | `A.or(B)`                                                      |
| `.extend({ ... })`                        | `.merge({ ... })`                                              |
| `.refine(fn, message)`                    | `.narrow((v, ctx) => fn(v) \|\| ctx.reject({ message }))`      |
| `.transform(fn)`                          | `.pipe(fn)`                                                    |
| `z.coerce.number()`                       | `type("unknown").pipe(Number).to("number")`                    |
| `z.infer<typeof T>`, `z.input`            | `typeof T.infer`, `typeof T.inferIn`                           |
| `T.parse(x)`, `T.safeParse(x)`            | `T.assert(x)`, `T(x)` checked with `instanceof type.errors`    |

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

- `.merge()` adds keys and replaces existing ones. `.and()` intersects, and throws when a key's types conflict.
- To share keys between types, merge a base Type. To reuse a pattern across Types, define a Generic: `const Page = type("<t>", { items: "t[]", total: "number" })`, called as `Page(Item)`.
- A helper can compose Types by taking a `Type<t>` and calling its methods, which type-checks without casts: `const withId = <t extends object>(T: Type<t>) => T.and({ id: "string" })`. In a precompiled project, keep its body to one expression, or consts and one `return`, and call it with Types the build knows, like `withId(User)`. A helper that passes a generic definition to `type()` needs casts.
- A function that accepts any Type takes `type.Any`, not `Type<any>`. To keep the output type, like a form-action wrapper that validates and passes the data on, make it generic: `<T extends type.Any>(schema: T, action: (data: T["infer"]) => void)`. To embed the Type it receives in a new definition, take `type.Any<t>`: `const page = <t>(item: type.Any<t>) => type({ items: item.array(), total: "number" })`.
- `.as<T>()` is a cast. To infer a narrower type, use `.narrow()` with a type predicate, e.g. `(s): s is \`data-${string}\` => s.startsWith("data-")`.

## Parsing and transforming

Keywords ending in `.parse` transform their input. `.to()` validates the parsed result, and `.pipe()` runs your own function. A morph receives the caller's value itself, not a copy, so return a new value instead of mutating its argument.

```ts
// "8080" -> 8080, then checked as a port
const parsePort = type("string.integer.parse").to("0 < number <= 65535")

// a JSON string -> a validated object, e.g. a request body from
// `await request.text()`, so malformed JSON is an error like any other
const parsePayload = type("string.json.parse").to({ id: "number.integer" })

// any function, after validation
const parseTrimmed = type("string").pipe(s => s.trim())

// form data, as Object.fromEntries(new FormData(form)) gives it: every value
// is a string, and an unchecked checkbox is absent
const Signup = type({
	email: "string.email",
	age: type("string.integer.parse").to("13 <= number <= 130"),
	terms: type("'on'").pipe(() => true as const)
})

// env vars arrive as strings, so parse them and give defaults
const Env = type({
	DATABASE_URL: "string.url",
	PORT: type("string.integer.parse").default("3000"),
	"DEBUG?": "'true' | 'false'"
})
```

Other morph keywords: `string.trim`, `string.lower`, `string.upper`, `string.numeric.parse`, `string.date.parse`, `string.date.iso.parse`, `string.url.parse`.

- A `.parse` keyword accepts only strings. When the value may already be parsed, keep both in a union: `"number | string.numeric.parse"`.
- A union can't include a morph whose input overlaps another branch, so `type("unknown").pipe(Number).or("undefined")` throws. Start the morph from the narrowest input, like `"string.numeric.parse | undefined"`, or handle the other case inside the pipe.
- A default is an input, so a morph's default is what it parses: `flag: type("'true' | 'false'").pipe(s => s === "true").default("false")`.

## Custom rules

Use `.narrow()` when a rule involves more than one value. Return `true` to accept, or `ctx.reject()` to give a message and a path. A narrow on an object runs only once every key is valid, so its error is never reported alongside a key's.

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

## Error messages

`.configure({ message })` replaces a Type's whole message, and `.describe()` what follows "must be". Each applies wherever that Type is used, including a precompiled build. A message on a key's value applies when the value is wrong, not when the key is missing, which reads `terms is missing`. To use it then too, configure the `required` code in the config module, where its function receives the missing key's `propString` and the `valueMeta` of the key's whole value, so configure that value last, after any `.pipe()` or `.to()`:

```ts
import { configure } from "arktype/config"

configure({
	required: {
		message: ctx =>
			typeof ctx.valueMeta.message === "string" ?
				ctx.valueMeta.message
			:	`${ctx.propString} is required`
	}
})
```

To show each message beside its field, group `out.issues` by `issue.path.join(".")`, keeping the first message for each key.

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

A type that only refers to itself can use `this`, as in `type({ name: "string", children: "this[]" })`. Types that refer to each other, like a JSON value and a JSON object, go in a scope:

```ts
const json = scope({
	Json: "string | number | boolean | null | Json[] | JsonObject",
	JsonObject: { "[string]": "Json" }
}).export()
```

## Extra keys

By default, keys a definition doesn't declare are allowed and left in the output. To reject or remove them for one object, use `"+"`:

```ts
const Strict = type({ "+": "reject", name: "string" })
const Stripped = type({ "+": "delete", name: "string" })
```

To remove them everywhere, as Zod does, call `configure({ onUndeclaredKey: "delete" })` instead. `.merge()` takes `"+"` from the object merged in, so with per-object `"+"`, write `.merge({ "+": "delete", ... })`; with the global setting, merged objects keep deleting.

An object that deletes keys, whether by `"+"` or by `configure`, transforms its input, so a union of such objects throws unless a key like a literal `kind` tells them apart.

## Integrations

- ArkType types are [Standard Schema](https://standardschema.dev), so they work directly with tRPC, oRPC, Hono and other libraries that accept one. react-hook-form takes them through `standardSchemaResolver` from `@hookform/resolvers/standard-schema`.
- `User.toJsonSchema()` returns the equivalent JSON Schema. It throws for what JSON Schema can't express, like `Date`, `bigint`, a morph or a `.narrow()`. Handle those with a `fallback` keyed by the error's `code`, e.g. `{ fallback: { date: ctx => ({ ...ctx.base, type: "string", format: "date-time" }) } }`, or pass `{ fallback: annotatingFallback }` (exported from `arktype`) to write them as `x-arktype-*` keywords instead.
- Global configuration (error messages, `onUndeclaredKey`, `numberAllowsInfinity`, and so on) goes through `configure` from `arktype/config`, in its own file, imported first by every file that creates a Type. Calling `configure` after any Type is created, even by reading a keyword like `type.number`, throws unless it changes nothing. See https://arktype.io/docs/configuration.md.

## Check your work

ArkType reports most mistakes in a definition as a TypeScript error at the definition, and the rest as a `ParseError` thrown when the definition runs. After writing or changing types, run the project's typecheck script (or `npx tsc --noEmit`) and its tests, then call each type on a valid and an invalid value and read the result.

## Errors and their fixes

| Error                                                                                               | Fix                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `'a' is unresolvable`                                                                               | quote a string literal, `"'a'"`, or use the keyword's full name: `number.integer`, `string.email`, `Date`                                   |
| `'{' is unresolvable`                                                                               | write an object as an object, not in a string                                                                                               |
| `'Type' is unresolvable`                                                                            | don't interpolate a Type into a string; use `Item.array()`, `Item.or(...)` or `[Item, "[]"]`                                                |
| `'^' is unresolvable`                                                                               | put a regex in slashes, `"/^a$/"`                                                                                                           |
| `Defaultable definitions like 'number = 0' are only valid as properties in an object or tuple`      | give the default in an object, `{ count: "number = 0" }`                                                                                    |
| `Only required keys may specify default values`                                                     | drop the `?`: a key with a default may be missing                                                                                           |
| `An unordered union of a type including a morph and a type with overlapping input is indeterminate` | narrow the morph's input so no other branch accepts it, as in `"string.numeric.parse \| undefined"`, or tell objects apart by a literal key |
| `Intersection at a of string and number results in an unsatisfiable type`                           | `.and()` found conflicting keys; use `.merge()` to replace them                                                                             |
| `Index keys "a", "b" should be specified as named props`                                            | write `Record<"a" \| "b", T>` as `{ a: T, b: T }`                                                                                           |
| `configure() must be called before any Type is created`                                             | import the module calling `configure()` before any module that creates a Type                                                               |

## Mistakes to avoid

- `number` rejects `NaN`, `Infinity` and `-Infinity`. Allow them in one type with `"number | number.Infinity | number.NegativeInfinity"` (or `number.NaN`), or everywhere with `configure({ numberAllowsInfinity: true })`.
- Don't mutate the argument of a `.pipe()` callback. It's the caller's data; the `clone` option that used to copy it no longer exists.
- An optional key can be missing, but not present with the value `undefined`, mirroring TypeScript's `exactOptionalPropertyTypes`. Write `"key?": "string | undefined"` to allow both.
- Don't hand-write a TypeScript interface next to the type. Derive it with `typeof T.infer`, so the two can't drift.
- An invalid definition is a TypeScript error at the definition itself, with a message saying what's wrong. Fix it there rather than casting it away.
- An `ArkErrors` may find its issues when first read, so they describe the data as it is then. Read `out.summary` or `out.issues` before the validated data can change, as reactive form state, an Immer draft or an `await` before reporting allow.
