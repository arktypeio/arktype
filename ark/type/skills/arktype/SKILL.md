---
name: arktype
description: Write, review or debug runtime validation in TypeScript with ArkType (the `arktype` package), precompile it with `@ark/aot`, migrate to it, or upgrade it from ArkType 2. Use when code imports from "arktype" or "@ark/aot"; when a TypeScript project needs to validate or parse untrusted data, like API request bodies, route handlers, form data, query params, env vars, JSON, config files, webhooks or LLM tool inputs; when adding a schema or validator; when setting up precompiled validation or fixing an error from `[plugin arktype]` or `ark check`; when converting schemas from Zod, Valibot, TypeBox, Yup, Joi, Effect Schema or JSON Schema, e.g. "migrate this project from Zod to ArkType"; or when upgrading `arktype` from 2.x to 3.
---

# ArkType

ArkType definitions are TypeScript type syntax, written as strings and objects, that also validate at runtime. If you know the TypeScript type, write that.

## Migrating a project

Migrating from Zod, Valibot, TypeBox, Yup, Joi, Effect Schema or JSON Schema? Read [references/migrating.md](references/migrating.md) first and follow its steps. It has the workflow, the defaults that differ and a section of tables for each library: skip the sections for libraries the project doesn't use. In short:

1. Write a config file that sets the old library's defaults, for Zod `configure({ onUndeclaredKey: "delete", exactOptionalPropertyTypes: false })`, and import it first in every file that creates a Type. In a package others install, or a project that already has ArkType Types, don't call `configure()`, which would change those Types too: the reference's step 2 has what to write instead.
2. Rewrite each schema where it is, under the same name, keeping what it accepts, rejects and returns. Keep each custom message as a `message`.
3. Keep the code free of casts and `any`.
4. Before removing the old library, compare the schemas the tests don't cover with their originals on the same inputs, all of them if there's no `test` script.
5. Swap packages with the project's package manager, then run the `typecheck` and `test` scripts until both pass, without changing what a test expects.
6. Ask which editor the user uses and offer its ArkType integration (syntax highlighting inside definitions, inline one-line type error summaries, string autocomplete and `os` auto-import exclusion; see https://arktype.io/docs/editor). For VS Code and its forks, run `code --install-extension arktypeio.arkdark` (or `cursor` / `codium` / `windsurf`); for Neovim, share the `ark/neovim` (`arktype.nvim`) plugin snippet; for Helix, share the `ark/tree-sitter/helix` config. Zed (`ark/zed`) and JetBrains IDEs (`ark/jetbrains`) are waiting to be published in their marketplaces — link to https://arktype.io/docs/editor.

If asked to precompile too, set it up last, as [references/precompile.md](references/precompile.md) says.

## Upgrading from ArkType 2

Follow https://arktype.io/docs/upgrading.md, whose checklist links each breaking change. What most code hits:

| ArkType 2                                                      | ArkType 3                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `out[0]`, `out.length`, `out.map(...)`, `for (const e of out)` | the same on `out.issues`                                                                      |
| `error.message`, for text naming its path                      | `out.summary`, a line per error; `error.message` now leaves the path out                      |
| `error.problem`, `{ problem: "..." }`                          | `error.message`, `{ message: "..." }`, reworded as a whole sentence                           |
| `out.flatProblemsByPath`, `out.byPath`, `out.flatByPath`       | `flatMessagesByPath(out)`, `byPath(out)`, `flatByPath(out)` from `arktype`                    |
| `out.message`, `out.toTraversalError()`                        | `out.summary`, `new TraversalError(out)`                                                      |
| `error.hasCode("min")`, `error.toString()`                     | `error.code === "min"`, `out.summary` (errors are plain objects; `error.message` has no path) |
| `ctx.errors.add(...)`                                          | `ctx.error(...)` or `ctx.reject(...)`                                                         |
| `configure()` anywhere, the `clone` option                     | a config file imported before any Type is created; remove `clone`                             |

Then update snapshots of error text: a message no longer says what the value was, like `(was a number)`, and string/array length bounds now read in `characters` / `items` instead of `length N`. Replace adapters written for ArkType 2 as [Integrations](#integrations) says: they pass valid data and fail on the first invalid input.

## Precompiling

A project whose bundler config uses `@ark/aot` (e.g. `precompile.vite()` from `@ark/aot/unplugin`) constructs every Type at build time and replaces it with a standalone validator, so arktype's parser doesn't ship. To set it up, to add validation to such a project or to fix a build error from it, read [references/precompile.md](references/precompile.md): it has the setup for each bundler, Next.js and test runner, how to write definitions the build accepts, and each build error with its fix. In short:

- Define Types from static values, and compose them inside definitions, like `const Admin = User.and({ role: "'admin'" })`. A definition reading a parameter, or a function calling `.or`, `.pick` or another composing method at runtime, fails the build. To reuse a pattern, define a Generic.
- Define Types in JavaScript or TypeScript modules. A Svelte component's script isn't precompiled, so one importing arktype fails the build: put the Types, and any code checking a result against `type.errors`, in a `.ts` module the component imports.
- If the project calls `configure()`, name its module as `config` under `precompile` in an `ark.json` beside `package.json`, which the plugin, the test drivers, the CLI and the ESLint rule all read.
- A build error names the file, line and column, then why, then the fix on its last line. Apply that fix. Don't set `allowUnsafe` or switch to `runtime: "arktype"` to get past one. `npx arktype check src` (or `pnpm exec ark check src`) lists every one without bundling.
- A validator's error messages say what failed but not what the value was, like `name must be a string`.
- The build works out which introspection members, like a JSON Schema or `expression`, each validator needs from the code reading it, its dependencies' included, so the MCP SDK, the AI SDK and OpenAPI generators get one with nothing to set. Setting one under `members` only overrides that. Code the build can't see, like code outside the bundle reading an entry's export, reads `undefined`, and warns in development naming the member to set true under `members`.

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
	// every error, one per line, e.g. `email must be an email address`
	console.error(out.summary)
} else {
	// out is narrowed to User
	console.log(out.name)
}
```

- Calling a type returns the validated data or an `ArkErrors` instance. It does not throw, so check with `instanceof type.errors` rather than wrapping it in `try`/`catch`.
- `ArkErrors` is not an array, though `for (const e of out)` iterates its errors. Read individual errors from `out.issues`, e.g. `out.issues[0]` or `out.issues.map(e => e.message)`, each with a `path`, `code` and `message`. A `message` leaves out its path, like `must be an email address`.
- `User.assert(data)` throws a `TraversalError` instead, for places where invalid data is a bug. In a `catch`, check `e instanceof TraversalError` (from `arktype`) and read `e.arkErrors.issues`.
- Name types in PascalCase (`User`). Name types that transform their input in camelCase (`parseUser`), since they behave like functions.
- `typeof User.infer` is the output type. `typeof User.inferIn` is the input type, which differs once a type transforms its input or has defaults.

## Syntax

Strings use TypeScript's operators. Write string literals in single quotes inside the definition. Object types don't go in strings: `"{ a: string }"` doesn't parse, so write objects as objects and name them in a scope to reuse them in a string.

| Want                    | Write                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| optional key            | `"key?": "string"`                                                                                               |
| default (objects only)  | `count: "number = 0"`, `plan: "'free' \| 'pro' = 'free'"`                                                        |
| object or array default | `tags: "string[] = []"`, `hosts: "string[] = ['localhost']"` (fresh array per call), or `Tags.default(() => [])` |
| union                   | `"string \| number"`, `"'a' \| 'b'"`                                                                             |
| array                   | `"string[]"`, `"(string \| number)[]"`                                                                           |
| tuple                   | `["string", "number"]`                                                                                           |
| number range            | `"number > 0"`, `"0 <= number < 1"`, `"1 <= number.integer <= 100"`                                              |
| string or array length  | `"string > 0"`, `"1 <= string <= 255"`, `"string[] >= 1"`                                                        |
| divisibility            | `"number % 2"`                                                                                                   |
| regex                   | `/^\d+$/` as a RegExp, or `"/^\\d+$/"` in a string                                                               |
| record                  | `"Record<string, number>"` or `{ "[string]": "number" }`                                                         |
| class instance          | `"Date"`, `"Map"`, or `type.instanceOf(MyClass)`                                                                 |
| enum from values        | `type.enumerated("a", "b")` or `type.valueOf(MyEnum)`                                                            |
| array of a Type         | `Item.array()`, `Item.array().atLeastLength(1)`                                                                  |
| custom error message    | `type.string.atLeastLength(8, "Use 8 or more characters")`                                                       |

A regex with flags, like `/^a$/i`, must be a RegExp. Bounds bind tighter than `|`, so `"string <= 500 | null"` is a string of at most 500 characters, or null.

Common keywords: `string.email`, `string.uuid`, `string.url`, `string.url.http`, `string.ip`, `string.semver`, `string.date.iso`, `string.date.iso.date`, `string.boolean`, `string.nonblank`, `string.alphanumeric`, `number.integer`, `number.safe`, `number.epoch`, and `object.json` for JSON data. The full list is at https://arktype.io/docs/keywords.md.

## From Zod

What a Zod schema becomes. To migrate a project, follow [references/migrating.md](references/migrating.md), which has every API, each library and the defaults that differ.

| Zod                                       | ArkType                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `z.object({ ... })`                       | `type({ ... })`, which keeps undeclared keys unless configured       |
| `z.string().min(1).max(100)`              | `"1 <= string <= 100"`                                               |
| `z.string().email()`, `.url()`, `.uuid()` | `"string.email"`, `"string.url"`, `"string.uuid"`                    |
| `z.number().int().positive()`             | `"number.integer > 0"`                                               |
| `z.enum(["a", "b"])`                      | `"'a' \| 'b'"`                                                       |
| `.optional()` on a key                    | `"key?": "T \| undefined"`, or `"key?": "T"` with Zod's defaults set |
| `.nullable()`                             | `"T \| null"`                                                        |
| `.default(x)`                             | `key: "T = x"` or `key: T.default(x)`                                |
| `z.array(T).min(1)`                       | `T.array().atLeastLength(1)`, or `"string[] >= 1"` in a string       |
| `z.union([A, B])`, `z.discriminatedUnion` | `A.or(B)`                                                            |
| `.extend({ ... })`, `.pick({ a: true })`  | `.merge({ ... })`, `.pick("a")`                                      |
| `.refine(fn, message)`                    | `.narrow((v, ctx) => fn(v) \|\| ctx.reject({ message }))`            |
| `.refine(fn, { message, path })`          | `ctx.reject({ message, relativePath: path })`                        |
| `.min(1, "Name is required")`             | `type.string.atLeastLength(1, "Name is required")`                   |
| `.transform(fn)`                          | `.pipe(fn)`                                                          |
| `z.coerce.number()`                       | `type("unknown").pipe(Number).to("number")`                          |
| `z.infer<typeof T>`, `z.input`            | `typeof T.infer`, `typeof T.inferIn`                                 |
| `T.parse(x)`, `T.safeParse(x)`            | `T.assert(x)`, `T(x)` checked with `instanceof type.errors`          |
| `e instanceof ZodError` in a `catch`      | `e instanceof TraversalError`, then `e.arkErrors.issues`             |

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
const OptionalAddress = Customer.partial("address")
const WithPrevious = Customer.required("previous")
```

Never interpolate a type into a string, as in ``type(`${Address}[]`)``. Use `Address.array()`, `Address.or(...)` and the other chained methods, or a tuple expression like `[Address, "[]"]`.

- `.merge()` adds keys and replaces existing ones. `.and()` intersects, and throws when a key's types conflict.
- `.merge()`, `"..."`, `.pick()`, `.omit()`, `.partial()`, `.required()` and `.map()` drop a `.narrow()` on the object they read (and `@ark/aot` warns about it; add `// @ark-allow-drop-narrow` if intended), or throw if the object also transforms its input: deletes undeclared keys, or has a default or a morph at a key. Keep the keys in a Type of their own, derive from that, and add each `.narrow()` last.
- To share keys between types, merge a base Type or `.pick()` them. `User.get("nick")` is one key's Type, without its `?` or its default, plus `| undefined` when the key is optional or defaulted. To reuse a pattern across Types, define a Generic: `const Page = type("<t>", { items: "t[]", total: "number" })`, called as `Page(Item)`. In a Generic's body, `Omit`, `Pick`, `Partial`, `Required` and `Merge` do what the methods of those names do: `const Create = type("<t extends object>", "Omit<t, 'id'>")`.
- `.as<T>()` is a cast. To infer a narrower type, use `.narrow()` with a type predicate, e.g. `(s): s is \`data-${string}\` => s.startsWith("data-")`.
- A definition built at runtime goes to `type.raw`, which infers nothing, then gets its type: `type.raw(Object.fromEntries(FLAGS.map(flag => [flag, "boolean"]))).as<Record<Flag, boolean>>()`.

A function that takes a Type types its parameter by what it does with it:

| The function                                | Signature                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| validates and returns the data              | `<t>(schema: { assert: (data: unknown) => t }, data: unknown): t`, or as a `class Repo<t>`'s field |
| returns the errors rather than throwing     | `<t>(schema: (data: unknown) => t \| ArkErrors, data: unknown)`, checked with `instanceof`         |
| needs the Type itself, with its output type | `<T extends type.Any>(schema: T): T["infer"]`                                                      |
| calls `.and()`, `.or()` or `.array()` on it | `<t extends object>(T: Type<t>) => T.and({ id: "string" })`                                        |
| puts it in a new definition                 | `<t>(item: type.Any<t>) => type({ items: item.array(), total: "number" })`                         |
| reads its `.props`                          | `(T: Type<Record<string, unknown>>) => T.props.map(prop => prop.key)`                              |
| picks, omits, merges or makes partial       | not a function: a Generic, as above                                                                |
| only stores or forwards it                  | `type.Any`, not `Type<any>`                                                                        |

- On a `type.Any` parameter, a method given a definition, like `T.or("null")` or `T.and({ ... })`, infers `any` with no error, and so does calling it. Annotate the call: `const out: T["infer"] | type.errors = schema(data)`.
- The `t` of a `type.Any<t>` isn't the output type once a Type has a default or a transform. `T["infer"]` is.
- A Type exported from a scope isn't a `Type<t>`, so pass it as `type(types.User)`. A Generic takes it as it is.
- In a precompiled project, keep a helper's body to one expression, or consts, `if`s that return and a final `return`, and call it with a Type the build knows, like `User`. A helper that passes a generic definition to `type()` needs casts.

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
	"DEBUG?": "string.boolean.parse"
})
```

Other morph keywords: `string.trim`, `string.lower`, `string.upper`, `string.boolean.parse`, `string.numeric.parse`, `string.date.parse`, `string.date.iso.parse`, `string.url.parse`.

- A `.parse` keyword accepts only strings. When the value may already be parsed, keep both in a union: `"number | string.numeric.parse"`.
- A check after a transform goes in `.to()`: `type("string.trim").to("string > 0")`.
- A union can't include a morph whose input overlaps another branch, so `type("unknown").pipe(Number).or("undefined")` throws. Start the morph from the narrowest input, like `"string.numeric.parse | undefined"`, or handle the other case inside the pipe.
- A default is an input, so a morph's default is what it parses: `flag: type("'true' | 'false'").pipe(s => s === "true").default("false")`.

## Custom rules

Use `.narrow()` only for what a constraint can't express, like a rule across keys; [Error messages](#error-messages) has the order to choose in. Return `true` to accept, or `ctx.reject()` to say what was wrong and where: a `message`, one whole sentence like `"Passwords must match"`, at a `relativePath` from the value being narrowed.

```ts
const Signup = type({
	password: "string >= 8",
	confirmPassword: "string"
}).narrow(
	(data, ctx) =>
		data.password === data.confirmPassword ||
		ctx.reject({
			message: "Passwords must match",
			relativePath: ["confirmPassword"]
		})
)
```

- Use `relativePath`, not `path`. `path` is from the root of the data, so it names the wrong key once the object is nested or in an array.
- Always reject with text. Returning `false` reads `must be valid according to an anonymous predicate`.
- For several errors, call `ctx.error({ message, relativePath })` for each, then return `true`.
- A narrow on an object runs only once every key is valid, so its error is never reported alongside a key's.
- A rule that depends on what the caller has, like a form's saved values, reads `ctx.context`. Declare its shape once on arktype's `ArkEnv` (`declare module "arktype" { interface ArkEnv { context(): { savedStreet?: string } } }`, in a file that imports or exports something) and validate with `T.withContext(context)`, a Standard Schema a form library takes as is. Don't create a Type for each value: one Type defined once can be precompiled. A narrow on literals can't read it, since ArkType checks them as the Type is defined.
- A narrow can't give a literal its own text. ArkType calls it on each literal the Type allows, like `false`, `null`, `undefined` or `'a'`, when the Type is defined, and removes those it rejects, so `type("boolean").narrow((v, ctx) => v || ctx.reject({ message: "Accept the terms" }))` reads `must be true`. Write the values allowed, with the message: `type("true").message("Accept the terms")`.

## Error messages

Choose in this order:

1. **Built-in messages.** They're specific (`must be non-empty`, `must be an email address`, `must be even`) and compose across unions: `"string.email | string.uuid"` reads `must be an email address or a UUID`. Customize only when the UI or an existing schema needs its own copy.
2. **`.describe()`, for wording that still composes.** `.describe("a valid email")` reads `must be a valid email`, joins a union's error (`must be a phone number, a username or a valid email`) and is the JSON Schema `description`.
3. **`.label()`, to name a field in its messages.** `unitPriceCents: type("number > 0").label("Unit price")` reads `Unit price must be positive`, or `Unit price must be a number (was missing)`, in the issue's `message` and the summary, while its `path` stays `unitPriceCents`. One call replaces a message per check written only to say which field failed, so use it only in place of such a message: a field whose message wouldn't otherwise be customized keeps the built-in one. It names the value it's on, not Types nested in it.
4. **A constraint method's `message`, for a sentence per check**: `type.string.atLeastLength(1, "Name is required").matching(/^[a-z]+$/i, "Enter a valid name")`. `.message()` gives a whole Type, a keyword or a union one sentence. Write `.message()` and `.describe()`, not `.configure({ message })` or `.configure({ description })`.
5. **`.narrow()`, only for what constraints can't express**: a rule across keys, a conditional rule, a check from another library. Never rewrite a length, range, pattern, non-empty array or keyword like `string.email` as a `.narrow()`.

Put each check on the value it checks, never on the object or array holding it: `countries: type.string.array().atLeastLength(1, "Pick a country")`, not `.narrow(v => v.countries.length > 0)`, and `limit: Money.merge({ amount_cents: type.number.moreThan(0, "Enter a limit above zero") })`, not a narrow reading `v.limit.amount_cents`. To check a value computed from the data, when the output can carry it, pipe to a Type that checks it: `Order.pipe(totalOf, type({ total: type.number.moreThan(0, "Add something to the order") }))`.

There are two ways to write custom text. Choose by the text you have:

| The text is                                                     | Write it as                                                                                                     | An issue's `message`    | Its line of `out.summary`     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------- |
| a whole sentence, like any Zod message: `"Enter a valid email"` | `message`, as a constraint method's last argument, `.message(text)`, a `"@"` tuple or `ctx.reject({ message })` | `Enter a valid email`   | `email: Enter a valid email`  |
| what the value must be: `"a valid email"`                       | `.describe(text)`, `.configure({ expected: text })`, `ctx.mustBe(text)`, `ctx.error(text)`                      | `must be a valid email` | `email must be a valid email` |

- A message from Zod, or any sentence a user reads, is always a `message`. Passed to `ctx.mustBe()`, as a string to `ctx.error()`, to `.describe()`, as `expected` or as a string after `"@"`, it would read `must be Enter a valid email`. `ctx.reject()` takes no string, so TypeScript flags `ctx.reject("Enter a valid email")`: write `ctx.reject({ message: "Enter a valid email" })`.
- An issue's `message` is what a form library, or anything else reading the Type through Standard Schema, shows beside the field. `out.summary`, and the `TraversalError` `.assert()` throws, write a line for each error with its path.
- A `message` isn't composed into other text. What a Type is `expected` to be is: a union lists it, as in `must be a valid email or null`. So with `| null` or `| undefined`, give the whole union the message, as in `type("string.email | null").message(text)`: a message on one branch is lost for a value of the wrong type. With `exactOptionalPropertyTypes: false`, an optional or defaulted key's value is such a union, so write `"role?": type("'admin' | 'user' | undefined").message(text)`: a message on an enum, a literal or a boolean alone is never said there.
- A `message` on `string.date.parse`, `string.url.parse` or `string.json.parse` isn't said for a string that fails to parse. Check, then convert: `type("string.date").pipe(s => new Date(s)).message(text)`.

Pass a message as the last argument to a constraint method, like `atLeastLength`, `atMostLength`, `matching`, `atLeast`, `lessThan` or `divisibleBy`, and only that check says it, as with Zod's `.min(1, "Name is required")`. A check with no method, like a keyword's, takes its error code (`minLength`, `maxLength`, `pattern`, `predicate`, `min`, `max`, `divisor`) as `.message()`'s second argument. Pure predicate keywords (`string.url`, `string.date`) use code `"predicate"` — passing `"pattern"` to them silently does nothing. Hybrid pattern+predicate keywords (`string.url.http`, `string.creditCard`) run both checks, so use a whole-value `.message(text)` (or configure both `"pattern"` and `"predicate"`) to cover all invalid strings. `string.json` and `string.regex` call `ctx.reject()` inside their predicate, so `.message()` doesn't override their failure text:

```ts
const Invite = type({
	name: type.string.atLeastLength(1, "Name is required"),
	email: type("string.email").message("Enter a valid email", "pattern"),
	password: type.string
		.atLeastLength(8, "Use 8 or more characters")
		.matching(/[0-9]/, "Include a number")
})

// name: Name is required
// email: Enter a valid email
// password: Include a number
// password: Use 8 or more characters
const out = Invite({ name: "", email: "x", password: "short" })
```

- A check's message leaves other errors with ArkType's text, like `name must be a string (was missing)`, as Zod's did. To give those their own, add `.message(text, "self")` for a missing key and `.message(text, "domain")` for a wrong type, after the constraints.
- A whole-value message, `.message(text)`, is said for every failure, a wrong type and a missing key included, as Zod's `z.string({ error })` is. Configure it last, after any `.pipe()` or `.to()`, and never after checks' messages, which it replaces.
- A code names every check of that kind in the Type, nested keys' included. A message passed to a constraint method is that check's alone, so two patterns, or an array's length and its elements', keep their own: `Tag.array().atLeastLength(1, "Add a tag")`.
- After a `.pipe()` or `.to()`, a code doesn't reach the Type the output is checked with, and a whole-value or `"self"` message on the transformed Type replaces the ones inside it. Give that Type its messages before passing it: `type("string.trim").to(type.string.atLeastLength(1, "Name is required"))`.
- Several failed checks report a pattern before a length. For an empty field to say `Email is required` first, as Zod's `.min(1, "...").email("...")` did, leave out the `>= 1` and choose by the value: `.message(e => (e.data === "" ? "Email is required" : "Enter a valid email"), "pattern")`.

To show each message beside its field, `flatMessagesByPath(out)` from `arktype` gives each path's messages, like `{ password: ["Include a number", "Use 8 or more characters"] }`. `lineOf(error)` formats a single `ArkError` as its line in `out.summary` (e.g. `email: Enter a valid email`), and both work in `@ark/aot` standalone builds.

## Forms

A form library like TanStack Form, or react-hook-form through `standardSchemaResolver`, takes a Type as a Standard Schema and shows each issue's `message` beside its field.

| A field that                              | Write                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| reads well with ArkType's own text        | `"string > 0"`: `must be non-empty`, with nothing to configure                                                             |
| had a message only to name it             | `type("number > 0").label("Unit price")`: `Unit price must be positive`, `Unit price must be a number`                     |
| is required, empty as `""` or `undefined` | `type("string > 0").message("Name is required")`                                                                           |
| must hold more than whitespace            | `"string.nonblank"`, which keeps the value; `string.trim` morphs it                                                        |
| is optional, left as `""`                 | `"string.email \| ''"`: `must be an email address or empty`                                                                |
| is a number above zero                    | `"number > 0"`: `must be positive`                                                                                         |
| is a choice that must be made             | `type.boolean.message("Choose yes or no")`                                                                                 |
| is a web link, or a plain `1.2.3` version | `"string.url.http"` (`string.url` allows `mailto:` and `javascript:`), `type("string.semver").matching(/^[\d.]+$/, "...")` |

- `type.string.atLeastLength(1, "Name is required")` says its message only for a string. `undefined`, a field's state before it's touched, reads `must be a string`. A whole-value `.message()` says it for both.
- A pattern chained beside a length, like `type("0 < string <= 50").matching(...)`, also fails `""`. Match `""` in the pattern, with `*` rather than `+`, so an empty field says only `must be non-empty`.
- Leave a field with ArkType's own text unless its copy must differ. Don't add a label, a description or a message to a field that has none just because a user reads it: the built-in text is the simpler default. Converting a schema, keep its custom copy where it said more than the field's name, and turn a message that only named the field into a label. A message, given or set with `.message()`, is never labeled.
- Don't wrap these in helpers like `nonEmptyString(name)`, `positiveNumber(message)` or `requiredBoolean(message)`: each is one expression, and the helper hides which of a constraint's message or a whole-value message the field gets.
- Name a nested object's Type and reuse it, as `beneficiary: Beneficiary.or("undefined")`, rather than writing `type({ ... })` inline at the key. Export the inferred type under the same name: `export const Beneficiary = type({ ... })` beside `export type Beneficiary = typeof Beneficiary.infer`, and annotate defaults and values with `Beneficiary`.
- Form state whose keys are present but may be `undefined` is `"string | undefined"` at each key. `.partial()` makes keys optional instead, which rejects `undefined` under `exactOptionalPropertyTypes`, the default.
- When the TypeScript type comes first, like an API's DTO, check the Type against it with `type.declare<Dto>().type({ ... })` (which also accepts spread tuple expressions like `.type(A, "|", B)`), which must match exactly. Add `{ assignable: true }` only when the form accepts less than the DTO, like required keys where it allows `undefined` or `null`. Don't declare a primitive: `type("string")` is already `Type<string>`.

## Recursive and cyclic types

A type that refers to itself uses `this`. Types that refer to each other go in a scope, where definitions reference each other by name:

```ts
import { scope, type } from "arktype"

const TreeNode = type({ value: "number", children: "this[]" })

const types = scope({
	User: { name: "string", "posts?": "Post[]" },
	Post: { title: "string", author: "User" }
}).export()

const post = types.Post({ title: "Hello", author: { name: "Ada" } })
```

Don't wrap definitions inside a scope with `type()`. They're resolved within the scope, and `type()` would resolve them globally, so an alias there is `unresolvable`. For a `.narrow()` or a `.pipe()` inside a scope, write a tuple: `["Tag[]", ":", (tags, ctx) => ...]` or `["string", "=>", s => s.trim()]`. For JSON data, use the built-in `"string | number | boolean | null | object.json"` rather than a recursive type of your own. Define recursive Types once at module scope so they aren't recreated on each call. To infer every exported alias of a `Module` or `Scope` at once, use `Module.infer<typeof types>` / `Module.infer.In<typeof types>` or `Scope.infer<typeof $>` / `Scope.infer.In<typeof $>`. To restrict a scope's ambient keywords or opt out of ArkType's defaults for a DSL, pass `{ ambient: {} }`, a `Module` like `ark.export("string", "number")`, or a record of `Type`s/`Generic`s/`Module`s as the second argument to `scope()` or `type.module()`.

TypeScript can't write an inferred cycle in a `.d.ts`: `tsc` declares it as `any`, or fails with `TS5088`. In a package or project whose declarations are emitted, write them with `npx arktype declare` instead, which names each cycle for its alias and changes nothing at runtime. See https://arktype.io/docs/precompile/advanced.md.

## Extra keys

By default, keys a definition doesn't declare are allowed and left in the output. To reject or remove them for one object, use `"+"`:

```ts
const Strict = type({ "+": "reject", name: "string" })
const Stripped = type({ "+": "delete", name: "string" })
```

To remove them everywhere, as Zod does, call `configure({ onUndeclaredKey: "delete" })` instead. `.merge()` takes `"+"` from the object merged in, so with per-object `"+"`, write `.merge({ "+": "delete", ... })`; with the global setting, merged objects keep deleting.

Objects that delete keys, whether by `"+"` or by `configure`, can overlap in a union: data more than one branch accepts keeps each key any of them declares, so `Item.or(Item.array())` and a union of two objects with no literal key like `kind` to tell them apart both work. A default, a transform at a key, or a recursive type can't be joined that way, so a union throws a `ParseError` saying it's indeterminate when an object holding one accepts data another branch also could. Choose the branch in a `.pipe()` instead:

```ts
const Item = type({ "+": "delete", id: "string", tags: "string[] = []" })
const Items = Item.array()

const OneOrMany = type("object").pipe(v =>
	Array.isArray(v) ? Items(v) : Item(v)
)
```

Where objects delete keys, don't `.narrow()` a union of them at an optional key or before `.or("null")`: its errors become one `union` issue at the union's path, without the failing key's path. Narrow the object holding the key, and reject with `relativePath: ["key"]`.

## Integrations

- ArkType types are [Standard Schema](https://standardschema.dev), so they work directly with tRPC, oRPC, Hono and other libraries that accept one. The MCP TypeScript SDK takes them as a tool's `inputSchema` from its second major version, `@modelcontextprotocol/server`; `@modelcontextprotocol/sdk` accepts only Zod. react-hook-form takes them through `standardSchemaResolver` from `@hookform/resolvers/standard-schema`.
- For a model's structured output or a tool, the AI SDK takes a Type as `schema` or `inputSchema`. The OpenAI SDK takes one through `standardResponseFormat` and `standardFunction` from `openai/helpers/standard-schema` (6.49 or later, every key required), and the Anthropic SDK through `betaStandardSchemaOutputFormat` and `betaStandardSchemaTool` from `@anthropic-ai/sdk/helpers/beta/standard-schema` (0.121 or later). LangChain's `tool()` type-checks with a Type but throws when the tool runs: give it `schema: T.toJsonSchema()` and call `T.assert(input)` inside.
- Prefer a library's Standard Schema entry point (`standardSchemaResolver`, Hono's `sValidator` from `@hono/standard-validator`, Superforms' `standard()`) over an adapter written for ArkType 2 (`@hono/arktype-validator`, Superforms' `arktype()`, `arktypeResolver` before `@hookform/resolvers` 5), which fails on invalid input.
- `User.toJsonSchema()` returns the equivalent JSON Schema. It throws for what JSON Schema can't express, like `Date`, `bigint`, a morph or a `.narrow()`. Handle those with a `fallback` keyed by the error's `code`, e.g. `{ fallback: { date: ctx => ({ ...ctx.base, type: "string", format: "date-time" }) } }`, or pass `{ fallback: annotatingFallback }` (exported from `arktype`) to write them as `x-arktype-*` keywords instead.
- `fromJsonSchema(schema)` from `arktype` reads a JSON Schema, or a Standard JSON Schema like a Zod schema (read as the JSON Schema it writes, so without its refinements or transforms), into a Type, inferring a literal JSON Schema's type. To compare schemas in any of those formats, like whether a new API schema still accepts what the old one did, read each with `fromJsonSchema` and use `.extends()`, `.equals()` or `.overlaps()`. Type methods take definitions, so pass a JSON Schema through `fromJsonSchema` first. See https://arktype.io/docs/json-schema/compare.md.
- A model reads what a tool's parameter means from its JSON Schema `description`, which `.describe("the name of a city")` writes. The same text is what the field's errors say it must be. On a Type with checks, `.describe(text, "self")` leaves each check its own error, like `must be at most 7`.
- Global configuration (error messages, `onUndeclaredKey`, `exactOptionalPropertyTypes`, `numberAllowsInfinity`, and so on) goes through `configure` from `arktype/config`, in its own file, imported first by every file that creates a Type. Calling `configure` after any Type is created, even by reading a keyword like `type.number`, throws unless it changes nothing. See https://arktype.io/docs/configuration.md.

## Check your work

ArkType reports most mistakes in a definition as a TypeScript error at the definition, and the rest as a `ParseError` thrown when the definition runs. After writing or changing types:

1. Run the project's typecheck script, or `npx tsc --noEmit`.
2. Call each new or changed type on a valid and an invalid value and read what it says, in a scratch file you delete afterwards:

```ts
import { type } from "arktype"

const User = type({
	name: type.string.atLeastLength(1, "Name is required"),
	"age?": "number.integer >= 0"
})

const check = (T: type.Any, valid: unknown, invalid: unknown) => {
	const out = T(valid)
	if (out instanceof type.errors) throw new Error(`rejected: ${out.summary}`)
	const errors = T(invalid)
	if (!(errors instanceof type.errors)) throw new Error("accepted invalid data")
	// read each line: "must be Name is required" means a message was passed as `expected`
	console.log(errors.summary)
}

check(User, { name: "Ada" }, { name: "", age: -1 })
```

3. Run the project's tests.

## Errors and their fixes

| Error                                                                                               | Fix                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'a' is unresolvable`, or `'int' is unresolvable. Did you mean 'number.integer'?`                   | use the name it suggests, or quote a string literal, `"'a'"`. Keywords have full names: `number.integer`, `string.email`, `Date`                                                                  |
| `Type definitions must be strings or objects (was Function)`                                        | a class is `type.instanceOf(MyClass)` or a keyword like `"Date"`, and a predicate is `.narrow(fn)`                                                                                                |
| `configure() has no option 'clone'`                                                                 | remove an option 3.0 dropped, like `clone`, or use the name the error suggests for a misspelled one                                                                                               |
| `problem was removed in 3.0; write message`                                                         | rename `problem` to `message` in `.configure()` and `ctx.reject()`, and write it as a whole sentence                                                                                              |
| `'{' is unresolvable`                                                                               | write an object as an object, not in a string                                                                                                                                                     |
| `'Type' is unresolvable`                                                                            | don't interpolate a Type into a string; use `Item.array()`, `Item.or(...)` or `[Item, "[]"]`                                                                                                      |
| `'^\d+$' is unresolvable`, or part of another regex, like `'^'`                                     | put a regex in slashes, `"/^\\d+$/"`                                                                                                                                                              |
| `Defaultable definitions like 'number = 0' are only valid as properties in an object or tuple`      | give the default in an object, `{ count: "number = 0" }`                                                                                                                                          |
| `Only required keys may specify default values`                                                     | drop the `?`: a key with a default may be missing                                                                                                                                                 |
| `Argument of type 'never[]' is not assignable to parameter of type '() => ...'` at `.default([])`   | an object or array default is a function, `.default(() => [])`, or `"string[] = []"` / `"string[] = ['localhost']"` in a string                                                                   |
| `An unordered union of a type including a morph and a type with overlapping input is indeterminate` | narrow the morph's input so no other branch accepts it, as in `"string.numeric.parse \| undefined"`; for an object with a default, transform or recursion at a key, see [Extra keys](#extra-keys) |
| `merge operand must be an object (was (In: { ... }) => To<...>)`, or `pick`, `omit`, `partial`      | the object has a `.narrow()` and deletes undeclared keys or has a default or morph at a key: call the method on the object before its `.narrow()`, then add the narrow                            |
| `Intersection at a of string and number results in an unsatisfiable type`                           | `.and()` found conflicting keys; use `.merge()` to replace them                                                                                                                                   |
| `Index keys "a", "b" should be specified as named props`                                            | write `{ "['a' \| 'b']": T }` as `{ a: T, b: T }` (or `Record<'a' \| 'b', T>`)                                                                                                                    |
| `configure() must be called before any Type is created`                                             | import the module calling `configure()` before any module that creates a Type                                                                                                                     |
| `Must use import to load ES Module: .../arktype/out/index.js`, from Jest                            | arktype ships ES modules only: add `transformIgnorePatterns: ["/node_modules/(?!(\\.pnpm\|arktype)/)"]` and a transform that reads JavaScript, like the `ts-jest/presets/js-with-ts` preset       |
| an error message reading `must be Enter a valid email`                                              | a sentence was passed as `expected`; pass it as `message`                                                                                                                                         |

## Mistakes to avoid

- `number` rejects `NaN`, `Infinity` and `-Infinity`. Allow them in one type with `"number | number.Infinity | number.NegativeInfinity"` (or `number.NaN`), or everywhere with `configure({ numberAllowsInfinity: true })`.
- An array passes an object whose keys are all optional, and a `Record` its elements fit, like `"Record<string, unknown>"`. To reject it, add `.narrow((o, ctx) => !Array.isArray(o) || ctx.mustBe("an object"))`.
- Validation is synchronous. An async `.narrow()` is a type error, and an async `.pipe()` puts its promise in the output, where an error it reports after an `await` is lost. Run async checks on the validated data.
- Don't mutate the argument of a `.pipe()` callback. It's the caller's data; the `clone` option that used to copy it no longer exists. Output shares what a Type didn't change with its input too, where Zod returns copies, so copy a parsed array before sorting or pushing to it.
- An optional key can be missing, but not present with the value `undefined`, mirroring TypeScript's `exactOptionalPropertyTypes`. An object built like `{ DEBUG: process.env.DEBUG }` holds `undefined` for an unset variable, and a default doesn't replace it either. Write `"key?": "string | undefined"` to allow both, or set `configure({ exactOptionalPropertyTypes: false })` where the project's tsconfig doesn't enable that option.
- With `"sideEffects": false` in `package.json`, a bundler drops `import "./arktype.config.ts"`, so the bundle runs without the config. List the file: `"sideEffects": ["./src/arktype.config.ts"]`.
- Don't hand-write a TypeScript interface next to the type. Derive it with `typeof T.infer`, so the two can't drift.
- An invalid definition is a TypeScript error at the definition itself, with a message saying what's wrong. Fix it there rather than casting it away.
- An `ArkErrors` may find its issues when first read, so they describe the data as it is then. Read `out.summary` or `out.issues` before the validated data can change, as reactive form state, an Immer draft or an `await` before reporting allow.
