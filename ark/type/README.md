<h1 align="center">ArkType</h1>
<h3 align="center"><i>TypeScript's 1:1 validator, optimized from editor to runtime</i></h3>

<p align="center">
	<a href="https://arktype.io/#board"><img src="https://arktype.io/image/og.png" width="640" alt="ArkType's places for validation speed, startup and bundle size, from the scoreboard at arktype.io" /></a>
</p>

Write a type the way TypeScript does. ArkType checks the definition as you type, infers the type and validates data against it at runtime.

**Using Zod?** [Switch with one prompt](#switching-from-zod). Your schemas keep their names, their messages and the libraries that read them.

```ts
import { type } from "arktype"

const User = type({
	name: "string > 0",
	email: "string.email",
	"age?": "number.integer >= 0"
})

// { name: string; email: string; age?: number }
type User = typeof User.infer

const out = User({ name: "Ada", email: "ada@", age: -1 })

if (out instanceof type.errors) {
	// email must be an email address
	// age must be non-negative
	console.error(out.summary)
} else {
	// out is a User
	console.log(out.name)
}
```

```sh
npm install arktype
```

- **Checked as you type.** A definition is parsed by TypeScript's own type system, so a typo is a type error where you wrote it.
- **Precompiled when you build.** [`@ark/aot`](#precompile) replaces each Type with a standalone validator, so no parser ships and nothing compiles at startup. [arktype.io](https://arktype.io/#board) has the benchmarks against Zod, Valibot, Typia and ajv, each with its method.
- **Accepted where Zod is.** Every Type is a [Standard Schema](https://standardschema.dev) that writes its own JSON Schema, so tRPC, oRPC, Hono, react-hook-form, the AI SDK and the MCP SDK [accept it](https://arktype.io/docs/integrations).

## Switching from Zod

One command, then one prompt to your coding agent:

```sh
npx skills add arktypeio/arktype
```

```
Migrate this project from Zod to ArkType.
```

The [skill](https://arktype.io/docs/agents) teaches your agent ArkType and includes the [migration guide](https://arktype.io/docs/migrating) it follows. It converts each schema where it is, under the same name, keeping what the schema accepts, rejects and returns. Before removing `zod`, it runs each schema your tests don't cover against its Zod original on the same inputs, then runs your typecheck and tests. Where a dependency accepts only Zod, it keeps Zod for that call and tells you.

```ts
// before
import { z } from "zod"

const Signup = z.object({
	email: z.email("Enter a valid email"),
	password: z.string().min(8, "Use 8 or more characters"),
	role: z.enum(["admin", "member"])
})

type Signup = z.infer<typeof Signup>
```

```ts
// after
import { type } from "arktype"

const Signup = type({
	email: ["string.email", "@", { message: "Enter a valid email" }],
	password: ["string >= 8", "@", { message: "Use 8 or more characters" }],
	role: "'admin' | 'member'"
})

type Signup = typeof Signup.infer
```

### What you keep

**Your messages.** A `message` is shown exactly as you wrote it and never includes the path, as Zod's `issue.message` doesn't. A form library reading either `Signup` above through Standard Schema gets the same path and message for each issue:

```ts
Signup["~standard"].validate({ email: "x", password: "short", role: "admin" })
// {
//   issues: [
//     { path: ["email"], message: "Enter a valid email", ... },
//     { path: ["password"], message: "Use 8 or more characters", ... }
//   ]
// }
```

A missing key says its value's message too, so it covers `required_error`. A refinement's message becomes `ctx.reject({ message, path })`, and `out.summary` names each path for a log: `email: Enter a valid email`.

**Your integrations.** A library that accepts Zod through Standard Schema accepts the Type in the same call: tRPC's `.input()`, TanStack Form, `@t3-oss/env-*`, the AI SDK's `tool()` from v6 and v2 of the MCP SDK. `zodResolver` becomes `standardSchemaResolver`, and `zod-to-json-schema` becomes `Signup.toJsonSchema()`. The guide [lists each swap](https://arktype.io/docs/migrating#migrating-a-project).

**Your pace.** A Zod schema works inside an ArkType definition, so you can convert one file at a time:

```ts
// not converted yet
const Address = z.object({ street: z.string(), city: z.string() })

const User = type({ name: "string", address: Address })
```

Not switching yet? [ArkSets](https://arktype.io/docs/sets) runs ArkType's set theory on the Zod schemas you have: `isSubset(v1, v2)` tells you whether a schema change still accepts everything the old one did.

### What changes

These are the differences a migration has to handle. The guide covers each, and your agent reports any it couldn't keep identical.

- **Defaults differ.** `z.object()` removes undeclared keys and `.optional()` accepts `undefined`. ArkType keeps undeclared keys and treats an optional key as TypeScript's `exactOptionalPropertyTypes` does, so the migration sets `onUndeclaredKey: "delete"` once and writes `"key?": "T | undefined"`. [Defaults that differ](https://arktype.io/docs/migrating#defaults-that-differ) has the full table.
- **Validation is synchronous.** An async `.refine()` moves out of the schema, to run after validation.
- **A check across keys runs last.** A `.narrow()` on an object runs once every key is valid, where Zod 4 also runs a `.refine()` when a key fails a check like `.min()`.
- **Default error text is ArkType's.** `must be an email address` where Zod says `Invalid email address`. Messages you wrote are unchanged.

<details>
<summary><b>Zod to ArkType, the common cases</b></summary>

| Zod                                       | ArkType                                                     |
| ----------------------------------------- | ----------------------------------------------------------- |
| `z.object({ ... })`                       | `type({ ... })`                                             |
| `z.string().min(1).max(100)`              | `"1 <= string <= 100"`                                      |
| `z.string().email()`, `.url()`, `.uuid()` | `"string.email"`, `"string.url"`, `"string.uuid"`           |
| `z.number().int().positive()`             | `"number.integer > 0"`                                      |
| `z.enum(["a", "b"])`                      | `"'a' \| 'b'"`                                              |
| `z.array(z.string()).min(1)`              | `"string[] >= 1"`                                           |
| `z.union([A, B])`, `z.discriminatedUnion` | `A.or(B)`, which finds the discriminant itself              |
| `.extend({ ... })`                        | `.merge({ ... })`                                           |
| `.refine(fn, message)`                    | `.narrow((v, ctx) => fn(v) \|\| ctx.reject({ message }))`   |
| `.transform(fn)`                          | `.pipe(fn)`                                                 |
| `z.infer<typeof T>`, `z.input`            | `typeof T.infer`, `typeof T.inferIn`                        |
| `T.parse(x)`, `T.safeParse(x)`            | `T.assert(x)`, `T(x)` checked with `instanceof type.errors` |

</details>

The guide maps [the whole Zod API](https://arktype.io/docs/migrating#zod), and has tables for Valibot, TypeBox, Yup, Joi, Effect Schema and JSON Schema.

## Precompile

```sh
npm install -D @ark/aot
```

```ts
// vite.config.ts
import { precompile } from "@ark/aot/unplugin"

export default {
	plugins: [precompile.vite()]
}
```

When you build, each Type your program defines becomes a validator with only the checks it needs, on `arktype/runtime`. The code that calls it doesn't change, and neither do your definitions or the types they infer.

- **Plugins** for Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun and Farm, with drivers for Node, Bun's runtime and Next's Turbopack. Without a bundler, run `tsc && npx arktype-precompile --emit`. [Setup](https://arktype.io/docs/precompile/setup) has a config for each.
- **Errors that name the fix.** A definition the build can't precompile, like one built from a value known only at runtime, fails the build with its file, line, reason and what to write instead. `npx arktype-precompile --check "src/**/*.ts"` lists them before you switch.
- **Dynamic when you need it.** `type()` still parses definitions at runtime with no build step, and a precompiled build can leave any definition to it.

[Precompile](https://arktype.io/docs/precompile) has the benchmarks, the build times and how a precompiled validator differs.

## With agents

- `npx skills add arktypeio/arktype` adds the [skill](https://arktype.io/docs/agents): current syntax, how it maps to TypeScript, the mistakes to avoid and how to work in a precompiled project.
- Every docs page is Markdown at its URL plus `.md`, and [arktype.io/llms.txt](https://arktype.io/llms.txt) indexes them.
- Every error names its fix, from `tsc`, from the build and from validation, so an agent can act on each without a docs lookup.

## New in 3.0

- [Precompilation](https://arktype.io/docs/precompile) with `@ark/aot`
- [Codecs](https://arktype.io/docs/codecs): `codec` pairs a morph with its inverse, and `.encode` inverts a Type's morphs
- [Errors as plain objects](https://arktype.io/docs/errors), each with a `path`, a `code` and a `message`
- [Error messages in other languages](https://arktype.io/docs/i18n)
- [JSON Schema](https://arktype.io/docs/json-schema/to-json-schema) for draft 2020-12, draft-07 and OpenAPI 3.0, from every Type
- [ArkSets](https://arktype.io/docs/sets): `isSubset(v1, v2)` and the rest of ArkType's set algebra, for Types, JSON Schemas and Standard JSON Schemas like Zod's

The [announcement](https://arktype.io/docs/blog/3.0) has the rest, and [Upgrading](https://arktype.io/docs/upgrading) lists each breaking change since 2.2 with what to write instead.

## Docs

[arktype.io](https://arktype.io/docs/intro/setup)

## Contributions

We accept and encourage pull requests from outside ArkType. Planned work is tracked in [this GitHub project](https://github.com/orgs/arktypeio/projects/4).

Depending on your level of familiarity with type systems and TS generics, some parts of the codebase may be hard to jump into. That said, there's plenty of opportunities for more straightforward contributions. We'd generally recommend starting with one of these issues labeled [external-contributor-friendly](https://github.com/orgs/arktypeio/projects/4/?filterQuery=label%3A%22external-contributor-friendly%22).

If you're planning on submitting a non-trivial fix or a new feature, please [create an issue first](https://github.com/arktypeio/arktype/issues/new) so everyone's on the same page. The last thing we want is for you to spend time on a submission we're unable to merge.

When you're ready, check out our [guide](https://github.com/arktypeio/arktype/blob/main/.github/CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](https://github.com/arktypeio/arktype/blob/main/LICENSE).

## Code of Conduct

We will not tolerate any form of disrespect toward members of our community. Please refer to our [Code of Conduct](https://github.com/arktypeio/arktype/blob/main/.github/CODE_OF_CONDUCT.md) and reach out to david@arktype.io immediately if you've seen or experienced an interaction that may violate these standards.

## Sponsorship

We've been working full-time on this project for multiple years and it means a lot to have the community behind us.

If the project has been useful to you and you are in a financial position to do so, please chip in via [GitHub Sponsors](https://github.com/sponsors/arktypeio).

Otherwise, consider sending me an email (david@arktype.io) or [message me on Discord](https://arktype.io/discord) to let me know you're a fan of ArkType. Either would make my day!

### ArkSponsors ⛵

<table>
    <tr>
        <th>get-convex</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/get-convex"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/get-convex"
            /></a>
        </td>
    </tr>
</table>

### Sponsors 🥰

<table>
    <tr>
        <th>mewhhaha</th>
        <th>jahands</th>
        <th>Phalangers</th>
        <th>WilliamConnatser</th>
        <th>JameEnder</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/mewhhaha"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/mewhhaha"
            /></a>
        </td>
        <td>
            <a href="https://github.com/jahands"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/jahands"
            /></a>
        </td>
        <td>
            <a href="https://github.com/Phalangers"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/Phalangers"
            /></a>
        </td>
        <td>
            <a href="https://github.com/WilliamConnatser"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/WilliamConnatser"
            /></a>
        </td>
        <td>
            <a href="https://github.com/JameEnder"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/JameEnder"
            /></a>
        </td>
    </tr>
    <tr>
        <th>tylim88</th>
        <th>tpetry</th>
        <th>braden-w</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/tylim88"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/tylim88"
            /></a>
        </td>
        <td>
            <a href="https://github.com/tpetry"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/tpetry"
            /></a>
        </td>
        <td>
            <a href="https://github.com/braden-w"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/braden-w"
            /></a>
        </td>
    </tr>
</table>
