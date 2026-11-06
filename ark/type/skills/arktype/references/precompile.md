# Precompiling ArkType

`@ark/aot` constructs each Type when the project builds and replaces it with a standalone validator that imports only `arktype/runtime`, so arktype's parser never ships. Inferred types are unchanged, as are most definitions; one built from values known only at runtime is rewritten as [below](#writing-definitions-the-build-accepts). Full docs: https://arktype.io/docs/precompile/llms.txt.

## Set up

1. Add `arktype` to `dependencies` and `@ark/aot` (Node 22.12 or later) to `devDependencies` with the project's package manager, e.g. `npm i arktype` and `npm i -D @ark/aot`. Keep one copy of `arktype`: the build fails if the program resolves two.
2. Add the plugin to the bundler, as below.
3. In a monorepo, a workspace package, like a shared `schemas` package, that pnpm, npm, Yarn or Bun workspaces link into `node_modules` resolves to its own directory, so the build precompiles it with the program; nothing extra is needed. Pass each such package's directory to `--check` too, e.g. `src ../../packages/schemas/src`.
4. If the project calls `configure()`, name its module as `config` in an `ark.json` beside `package.json`, as below, or under an `"ark"` key of the same shape in `package.json` (the build fails if both are set). Put build options there, not in the plugin call: the plugin, the test drivers, `arktype-precompile` and the ESLint rule all read `ark.json`, but a test driver doesn't see the plugin's options, so the tests would fail without them.
5. Make the tests run precompiled too, as below.
6. Run `npx arktype-precompile --check src`, which reads each JavaScript and TypeScript file in `src` and lists each definition the build would refuse, with the fix, until every site is accepted. Then run the build and the tests.

The ESLint rule reports the same errors as code is written: add `configs.recommended` from `@ark/aot/eslint` to `eslint.config.js`.

```json
{
	"$schema": "./node_modules/@ark/aot/ark.schema.json",
	"precompile": { "config": "./src/arktype.config.ts" }
}
```

### Bundlers

Vite, and Vitest, which runs tests through the same plugin:

```ts
// vite.config.ts
import { precompile } from "@ark/aot/unplugin"

export default {
	plugins: [precompile.vite()]
}
```

Frameworks that build with Vite list it right after their own plugin and ahead of `react()`, a Babel plugin like the React Compiler's or another that rewrites modules:

- SvelteKit: `plugins: [sveltekit(), precompile.vite()]` in `vite.config.ts`
- TanStack Router: `plugins: [tanstackRouter(), precompile.vite(), react()]`, an order the build requires where it splits routes
- Astro: `vite: { plugins: [precompile.vite()] }` in `astro.config`
- Nuxt: `vite: { plugins: [precompile.vite()] }` and `nitro: { rollupConfig: { plugins: [precompile.rollup({ prune: process.env.NODE_ENV === "production" })] } }` in `nuxt.config.ts`, since Nitro bundles server routes and `shared/` itself with Rollup, which has no production mode to prune in

The build precompiles JavaScript and TypeScript modules, including an Astro `<script>`, but not a Svelte component's script or another file that isn't JavaScript or TypeScript: define the Types a component uses, with any function checking a result against `type.errors`, in a `.ts` module the component imports. A component may call a validator and read its `.allows` or `.assert`. Its other reads fail at `vite build`, not before, as `--check` reads only JavaScript and TypeScript.

esbuild needs `bundle: true`, and `precompile.esbuild()` ahead of any plugin that loads `.ts` files. A production build adds `conditions: ["production"]`, leaving out the checks validators make in development:

```ts
// build.ts
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"

await build({
	entryPoints: ["src/main.ts"],
	bundle: true,
	platform: "node",
	outfile: "dist/main.js",
	plugins: [precompile.esbuild()]
})
```

Others: `precompile.rollup()` (ahead of `@rollup/plugin-typescript`), `precompile.rolldown()`, `precompile.webpack()` (with ts-loader's `transpileOnly: true`, type-checking with `tsc --noEmit`), `precompile.rspack()`, `precompile.rsbuild()`, `precompile.farm()` and `precompile.bun()` for `Bun.build`, as `await Bun.build({ entrypoints: ["src/server.ts"], outdir: "dist", target: "bun", plugins: [precompile.bun()] })`, where `target: "bun"` builds for Bun rather than a browser. Snippets for each: https://arktype.io/docs/precompile/setup.md.

### Next.js

Next 16 builds with Turbopack. Export the config through `withPrecompile`, which reads the project before Turbopack starts so `next build` can prune. Add a loader rule for each extension holding a definition or the config module, and one for JavaScript mentioning arktype, so a dependency that defines Types fails the build rather than at runtime. Then alias arktype's entries to the runtime, and @ark/schema's runtime to the one the loader writes for your options:

```js
// next.config.js (or the same in next.config.ts)
import { withPrecompile } from "@ark/aot/turbopack"

export default withPrecompile({
	// for the pages router
	bundlePagesRouterDependencies: true,
	turbopack: {
		rules: {
			"*.ts": { loaders: ["@ark/aot/turbopack"] },
			"*.tsx": { loaders: ["@ark/aot/turbopack"] },
			"*.{js,mjs}": {
				condition: { content: /arktype/ },
				loaders: ["@ark/aot/turbopack"]
			}
		},
		resolveAlias: {
			arktype: "arktype/runtime",
			"arktype/codecs": "arktype/runtime",
			"arktype/config": "arktype/runtime",
			"arktype/errors": "arktype/runtime",
			"arktype/mutatesInput": "arktype/runtime",
			"@ark/schema/runtime": "@ark/aot/turbopack/runtime"
		}
	}
})
```

Next 15 builds with webpack, as does `next build --webpack`: push `precompile.webpack()` onto `config.plugins` in the `webpack` function instead.

On the pages router's server, Next otherwise leaves dependencies external, where the aliases don't reach, so a precompiled validator's errors fail `instanceof type.errors`. With either bundler, without `bundlePagesRouterDependencies: true` the build fails with `Next.js leaves the pages router's dependencies external on the server ...`. `transpilePackages: ["arktype"]` isn't enough: a dependency left external still loads its own copy of arktype. A package `serverExternalPackages` names that imports arktype fails the build too.

### Without a bundler

A project that `tsc` compiles to run from its `outDir` precompiles what it emits: `"build": "tsc && arktype-precompile --emit"`. `--emit` writes each module reading arktype again from its source, so run anything that rewrites `tsc`'s output, like `tsc-alias`, after it: `"tsc && arktype-precompile --emit && tsc-alias"`.

A library that others install doesn't precompile itself, with `--emit` or a bundler: an app's build fails for a dependency that imports `arktype/runtime`. Precompiling a library means publishing what `tsc` emits with `"ark": { "aot": true }` in its `package.json` and `arktype` in `peerDependencies`, so each app's build precompiles it, and running `npx arktype-precompile --check src` until it accepts every definition.

### Tests

- Vitest: nothing beyond the Vite plugin.
- `node --test`, or any Node program (Node 22.15 or later): `node --import ./register.ts --test`, or `node --import ./register.ts src/server.ts` to run the program, with this file beside `package.json` (as `register.js` where Node can't run TypeScript):

```ts
// register.ts
import { register } from "@ark/aot/node"

register()
```

- Bun: `Bun.plugin(precompile())` with `precompile` from `@ark/aot/bun`, in a file listed under `preload` in `bunfig.toml`, and again under `[test]` for `bun test`.
- Jest has no driver, so its tests run on arktype, whose messages add the value, like `(was "x")`, where a precompiled validator's don't.

A project with a config module loads it before each test file, or the first validator a test loads throws that it was created before `configure()` ran: list it in Vitest's `test.setupFiles`, after the plugin in Bun's `[test]` preload, or after the Node driver: `node --import ./register.ts --import ./src/arktype.config.ts --test`.

To check that each precompiled validator behaves as arktype does, run the tests once with `precompile.vite({ shadow: true })`.

## Writing definitions the build accepts

The build evaluates each definition, so it must be built from values the build knows, and anything composing a Type must happen inside a definition.

A helper whose body is one expression, or consts and one `return`, like ``const text = (max: number) => type(`0 < string <= ${max}`)`` or `const nullable = <t>(T: Type<t>) => T.or("null")`, precompiles at each call passing it values the build can read, like `text(50)`, `text(LIMIT * 10)` or `nullable(Product)`. Call it directly: passed as a callback or held in an object, it fails the build, and a module the plugin doesn't transform, like a `.svelte` file, can't call it.

| Instead of                                                           | Write                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| a helper called with a value known only at runtime, like a parameter | the call where that value is known, as `text(80)`                                                        |
| a shape object built or changed at runtime, then `type(shape)`       | each variant as its own Type, chosen at runtime: `const Post = import.meta.env.DEV ? DevPost : BasePost` |
| composing at runtime, as in `(keys: Key[]) => User.pick(...keys)`    | a Type for each case the program needs                                                                   |
| `const Plan = T.default(x)`, then `{ plan: Plan }`                   | `plan: T.default(x)` at the key: `.default()` gives a key's definition, not a Type                       |
| `import("arktype")` or `require("arktype")`                          | an `import` declaration                                                                                  |
| a Zod or Valibot schema inside a definition                          | the schema converted to ArkType; until it is, build with `runtime: "arktype"`                            |
| a definition only known at runtime, like one loaded from a database  | `// @ark-runtime` on the line before it, which ships arktype for that module                             |

Composing inside a definition is fine anywhere, even in a function body: `const Updates = StockUpdate.array().atLeastLength(1)` precompiles, as does `User.and({ role: "'admin'" })`. A read the build sees, like `Sku.description`, is replaced by its value.

## What changes at runtime

- A validator validates, `.assert()`s and is a Standard Schema, but has no `.and`, `.or`, `.pick` or other composing method. The build fails where it sees one called outside a definition.
- Each error in `out.issues` has only `code`, `path`, `data`, `expected` and `message`, and `arktype/runtime` doesn't export `byPath`, `flatByPath`, `flatProblemsByPath` or `messageIn`. To group messages by key, group `out.issues` by `issue.path.join(".")`.
- Error messages say what failed but not what the value was: `email must be an email address`, without `(was "x")`, and a missing key reads as its value would, `name must be a string`, without `(was missing)`. Text configured with `.configure({ message })` or `.describe()` is kept, as is a `required` message configured in the config module, whose function receives `propString` and `valueMeta` as in arktype.
- The build works out which introspection members, like `toJsonSchema()`, `json` and `~standard.jsonSchema`, each validator needs, baking each where it sees code read it, following it into its dependencies and, in a build reading one module at a time, into each module importing it. So the MCP SDK, the AI SDK, Elysia's OpenAPI plugin, hono-openapi and oRPC's `@orpc/arktype` converter need nothing set, and setting one under `members` only overrides what the build works out. Where the build loses track of a validator, like one passed to a function it can't resolve, it bakes each into it and a production build warns `precompile: baking each introspection member into ...`; the build is correct, only larger. Code the build can't see, like code outside the bundle reading an entry's export, reads a member it didn't bake and throws, naming the member to set true under `members`. A production build decides `assert`, `meta`, `~standard` and `methods` the same way, keeping in each validator what the code it reaches reads, like `~standard` for Hono's `sValidator`, with nothing to set. tRPC, Hono's validators, React Hook Form, TanStack Form and Router and t3-env need nothing.
- `drizzle-arktype` creates Types from your tables as the program runs, so it runs on arktype, as the next item sets, which ships the parser. To precompile those Types instead, write each one out with a line that fails to compile if it drifts from the table, like `const matches: Equals<typeof selectTask.infer, typeof tasks.$inferSelect> = true`, with `Equals` from migrating.md's How to convert.
- A dependency that imports arktype fails a standalone build unless it opts in with `"ark": { "aot": true }` in its `package.json`, or the program decides for it under `"precompile"`: `"dependencies": { "@t3-oss/env-core": "aot" }` precompiles one whose Types are static, like t3-env's presets, and `"dependencies": { "drizzle-arktype": "arktype" }` runs one creating Types from values it reads as it runs on arktype, sharing the program's `configure()`. A dependency that only reads `type.errors`, like `@hono/arktype-validator`, builds as it is.
- On a server, Vite leaves dependencies external, so a build fails for one that imports arktype with `The bundle leaves my-lib, which imports arktype ...`: add it to `ssr.noExternal`, or `dependencies` if it defines Types. Only a build checks this, and only for a package declaring arktype: `vite dev`, Vitest and `Bun.build`'s `external` stay silent.
- A library you publish ships what `tsc` emits, not a precompiled build, with `"ark": { "aot": true }` in its `package.json` and arktype in `peerDependencies`, so each app's build precompiles it with the app's arktype. Run `--check` on its source before publishing, or a refusal surfaces only in an app's build.
- Locales from `arktype/i18n` aren't supported.

## Errors and their fixes

Each build error names the file, line and column, then why, then the fix on its last line. Apply that fix. A bundler stops at the first error, so run `npx arktype-precompile --check src` to see them all. Don't set `allowUnsafe` to get past one, and don't switch to `runtime: "arktype"` unless the program really composes or introspects Types at runtime, as that ships arktype's parser again.

| The build says                                                                                                       | Fix                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `` `limit` is a parameter of makeField ...; its value is known only at runtime ``                                    | call the helper where that value is known, with it; see the table above                                                                 |
| `` `shape` is a parameter of createFinalSchema ..., which nothing calls by name; ... ``                              | mark the definition `// @ark-runtime`: only arktype sees what the caller, like a library, passes it                                     |
| `T.or reads or, which a standalone validator lacks`                                                                  | compose inside a definition, make the helper one expression, or consts and one `return`, or make it a Generic                           |
| `` `text` (...) is not a static helper: it runs `if (...)` ... ``                                                    | rewrite the helper's body as one expression, or consts and one `return`                                                                 |
| `` `text` is read outside a call the build precompiles ``                                                            | call the helper directly, with arguments the build can read                                                                             |
| `... exports text, a helper the build precompiles at each call, but ... imports it`                                  | call the helper in a `.ts` or `.js` module and import what it returns                                                                   |
| `` `shape` is written at ..., so its value at the site is not known ``                                               | write the object whole in its literal, or define each variant as its own Type                                                           |
| `User.description reads description, which a standalone validator lacks`                                             | read it inside a definition, or set that member under `members`                                                                         |
| `T.default(x) can't be precompiled yet`, `.default() gives the definition of an object's key`                        | write `.default(x)` at the object key it's for, not in a `const`, as the message shows                                                  |
| `flatProblemsByPath(out) calls flatProblemsByPath, which arktype/runtime doesn't export` (or `byPath`, `flatByPath`) | read `out.issues`, grouping by `issue.path.join(".")`; for `messageIn`, read `issue.message`                                            |
| `configure() is called, but the build has no config module`                                                          | add `"config"` to `ark.json`, as above                                                                                                  |
| `... loads src/schemas.ts, which creates a Type, before the config module ... runs`                                  | import the config module first in that file, before any module that creates a Type                                                      |
| `` `User` comes from `~/schemas`, which the build can't resolve ``                                                   | add the alias to `tsconfig.json`'s `paths`                                                                                              |
| `arktype resolves to more than one copy`, or a version mismatch                                                      | install one version of `arktype`, then clear the bundler's cache                                                                        |
| `my-lib imports arktype, which a standalone build resolves to arktype/runtime`                                       | set `"precompile": { "dependencies": { "my-lib": "aot" } }`, or `"arktype"` in place of `"aot"` if it creates Types from runtime values |
| `src/Form.svelte imports arktype, which a standalone build resolves to arktype/runtime`                              | move the Types, and any code reading `type`, into a `.ts` module the component imports; don't set `allowUnsafe`                         |
| `precompile.esbuild() needs bundle: true`                                                                            | set `bundle: true`                                                                                                                      |
| `Next.js leaves the pages router's dependencies external on the server ...`                                          | add `bundlePagesRouterDependencies: true` to the Next config                                                                            |
| `The bundle leaves my-lib, which imports arktype ...`                                                                | add the package to `ssr.noExternal` (Vite on a server), or bundle it                                                                    |
| `The build's serverExternalPackages option leaves my-lib ...` (Turbopack)                                            | remove the package from `serverExternalPackages`                                                                                        |
| `arktype resolves to ... rather than arktype/runtime` (Turbopack)                                                    | add the `resolveAlias` entries it lists                                                                                                 |
| `type is not a function` at runtime                                                                                  | a module defining Types wasn't precompiled, e.g. no Turbopack rule matches its extension; add one                                       |

Two messages concern `members`:

- `prune: keeping assert, meta, ~standard and methods, because the validator at src/schemas.ts:7:9 is lost where ...` (a warning): the build kept the members it couldn't prove unread, as where a Type is passed to a function it can't resolve; the build is correct, only larger. To build without the warning, set each member it names under `members` in `ark.json`, `true` where code may read it, like `~standard` where a library validates with it, else `false`, e.g. `"precompile": { "members": { "assert": false, "meta": false, "~standard": true, "methods": false } }`.
- `toJsonSchema isn't baked into this validator, as the build saw no code read it`, at runtime: code the build can't see read it, like code outside the bundle reading an entry's export; set that member true under `members`.

Every message and its fix: https://arktype.io/docs/precompile/troubleshooting.md.
