# Precompiling ArkType

`@ark/aot` constructs each Type when the project builds and replaces it with a standalone validator that imports only `arktype/runtime`, so arktype's parser never ships. Inferred types stay as they are, and so do most definitions; one built from values known only at runtime is rewritten as [below](#writing-definitions-the-build-accepts). Full docs: https://arktype.io/docs/precompile/llms.txt.

## Set up

1. Add `arktype` to `dependencies` and `@ark/aot` to `devDependencies` with the project's package manager, e.g. `npm i arktype` and `npm i -D @ark/aot`. Keep one copy of `arktype`: the build fails if the program resolves two. `@ark/aot` needs Node 22.12 or later.
2. Add the plugin to the bundler, as below.
3. In a monorepo, nothing extra is needed for a workspace package, like a shared `schemas` package, that the package manager links into `node_modules`, as pnpm, npm, Yarn and Bun workspaces do: it resolves to its own directory, so the build precompiles it with the program. Add each such package to `--check`'s patterns, e.g. `"src/**/*.ts" "../../packages/schemas/src/**/*.ts"`.
4. If the project calls `configure()`, name its module as `config` in an `ark.json` beside `package.json`, as below, or under an `"ark"` key in `package.json` itself, which takes the same shape (the build fails if both are set). Put build options there rather than in the plugin call: the plugin, the test drivers, `arktype-precompile` and the ESLint rule all read `ark.json`, but a test driver doesn't see options passed to the plugin, so the tests would fail without them.
5. Make the tests run precompiled too, as below.
6. Run `npx arktype-precompile --check "src/**/*.ts"`. It lists each definition the build would refuse, with the fix, and should end with every site accepted. Then run the build and the tests.

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

Frameworks that build with Vite take the same plugin, listed after theirs: SvelteKit in `vite.config.ts`, as `plugins: [sveltekit(), precompile.vite()]`, TanStack Router as `plugins: [tanstackRouter(), react(), precompile.vite()]`, which the build requires where it splits routes, Astro in `astro.config`, as `vite: { plugins: [precompile.vite()] }`, and Nuxt in `nuxt.config.ts`, as `vite: { plugins: [precompile.vite()] }` and `nitro: { rollupConfig: { plugins: [precompile.rollup({ prune: process.env.NODE_ENV === "production" })] } }`, since Nitro bundles server routes and `shared/` itself, with Rollup, which has no production mode to prune in. The build precompiles JavaScript and TypeScript modules, including an Astro `<script>`, but not a Svelte component's script or another file that isn't JavaScript or TypeScript: define the Types a component uses in a `.ts` module, with any function that checks a result against `type.errors`, and import those from the component. A component may call a validator and read its `.allows` or `.assert`. `--check` reads only JavaScript and TypeScript, so a component's other reads fail at `vite build`, not before.

esbuild, which needs `bundle: true`. Put `precompile.esbuild()` ahead of any plugin that loads `.ts` files. Add `conditions: ["production"]` to a production build, which then leaves out the checks validators make in development:

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

Others take the same plugin: `precompile.rollup()` (ahead of `@rollup/plugin-typescript`), `precompile.rolldown()`, `precompile.webpack()`, `precompile.rspack()`, `precompile.rsbuild()`, `precompile.farm()` and `precompile.bun()` for `Bun.build`. With webpack, set ts-loader's `transpileOnly: true` and type-check with `tsc --noEmit`. Snippets for each: https://arktype.io/docs/precompile/setup.md.

### Next.js

Next 16 builds with Turbopack. Add a loader rule for each extension that holds a definition or the config module, and one for JavaScript mentioning arktype, so a dependency that defines Types fails the build rather than at runtime. Then alias arktype's entries to the runtime:

```js
// next.config.js (or the same object in next.config.ts)
export default {
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
			"arktype/mutatesInput": "arktype/runtime"
		}
	}
}
```

With `next build --webpack`, push `precompile.webpack()` onto `config.plugins` in the `webpack` function instead.

### Without a bundler

A project that `tsc` compiles to run from its `outDir` precompiles what it emits: `"build": "tsc && arktype-precompile --emit"`.

### Tests

- Vitest: nothing to add beyond the Vite plugin.
- `node --test`, or any Node program (Node 22.15 or later): `node --import ./register.ts --test`, and `node --import ./register.ts src/server.ts` to run the program itself the same way, with this file beside `package.json` (as `register.js` where Node can't run TypeScript):

```ts
// register.ts
import { register } from "@ark/aot/node"

register()
```

- Bun: `Bun.plugin(precompile())` with `precompile` from `@ark/aot/bun`, in a file listed under `preload` in `bunfig.toml`, and again under `[test]` for `bun test`.

A project with a config module loads it before each test file, or the first validator a test loads throws that it was created before `configure()` ran: list it in Vitest's `test.setupFiles`, after the plugin in Bun's `[test]` preload, or after the Node driver: `node --import ./register.ts --import ./src/arktype.config.ts --test`.

To check that each precompiled validator behaves as arktype does, run the tests once with `precompile.vite({ shadow: true })`.

## Writing definitions the build accepts

The build evaluates each definition. It must be built from values the build knows, and anything composing a Type must happen inside a definition.

Helpers called with static arguments just work. A helper whose body is one expression, or consts and one `return`, like ``const text = (max: number) => type(`0 < string <= ${max}`)`` or `const nullable = <t>(T: Type<t>) => T.or("null")`, precompiles at each call passing it values the build can read, like `text(50)`, `text(LIMIT * 10)` or `nullable(Product)`. Call it directly: passed as a callback or held in an object, it fails the build, and a module the plugin doesn't transform, like a `.svelte` file, can't call it.

| Instead of                                                           | Write                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| a helper called with a value known only at runtime, like a parameter | the call where that value is known, as `text(80)`                                                        |
| a shape object built or changed at runtime, then `type(shape)`       | each variant as its own Type, chosen at runtime: `const Post = import.meta.env.DEV ? DevPost : BasePost` |
| composing at runtime, as in `(keys: Key[]) => User.pick(...keys)`    | a Type for each case the program needs                                                                   |
| `const Plan = T.default(x)`, then `{ plan: Plan }`                   | `plan: T.default(x)` at the key: `.default()` gives a key's definition, not a Type                       |
| `import("arktype")` or `require("arktype")`                          | an `import` declaration                                                                                  |
| a Zod or Valibot schema inside a definition                          | the schema converted to ArkType; until it is, build with `runtime: "arktype"`                            |
| a definition only known at runtime, like one loaded from a database  | `// @ark-runtime` on the line before it, which ships arktype for that module                             |

Composing inside a definition is fine anywhere, even in a function body: `const Updates = StockUpdate.array().atLeastLength(1)` precompiles, and so does `User.and({ role: "'admin'" })`. A read the build sees, like `Sku.description`, is replaced by its value.

## What changes at runtime

- A validator validates, `.assert()`s and is a Standard Schema, but has no `.and`, `.or`, `.pick` or other composing method. The build fails where it sees one called outside a definition.
- Each error in `out.issues` has only `code`, `path`, `data`, `expected` and `message`, and `arktype/runtime` doesn't export `byPath`, `flatByPath`, `flatProblemsByPath` or `messageIn`. To group messages by key, group `out.issues` by `issue.path.join(".")`.
- Error messages say what failed but not what the value was: `email must be an email address`, without `(was "x")`, and a missing key reads `name is missing`. Text you configure with `.configure({ message })` or `.describe()` is kept, as is a `required` message configured in the config module, whose function receives `propString` and `valueMeta` as it does in arktype.
- Introspection members like `toJsonSchema()`, `json` and `~standard.jsonSchema` are baked into each validator the build sees code read them off, following it into its dependencies, so the MCP SDK, the AI SDK, Elysia's OpenAPI plugin, hono-openapi and oRPC's `@orpc/arktype` converter need nothing set. Where the build loses track of a validator, like one passed to a function it can't resolve, it bakes each into it and a production build warns `precompile: baking each introspection member into ...`; the build is correct, only larger. Code the build can't see, like code outside the bundle reading an entry's export, reads a member it didn't bake and throws, naming the member to set true under `members`. tRPC, Hono's validators, React Hook Form, TanStack Form and Router and t3-env need nothing.
- A dependency that imports arktype fails a standalone build unless it opts in with `"ark": { "aot": true }` in its `package.json`. The program can decide for it under `"precompile"`: `"dependencies": { "@t3-oss/env-core": "aot" }` precompiles one whose Types are static, like t3-env's presets; `"dependencies": { "drizzle-arktype": "arktype" }` runs one that creates Types from values it reads as it runs on arktype, sharing the program's `configure()`. A dependency that only reads `type.errors`, like `@hono/arktype-validator`, builds as it is.
- A library you publish ships what `tsc` emits, not a precompiled build, with `"ark": { "aot": true }` in its `package.json` and arktype in `peerDependencies`, so each app's build precompiles it with the app's arktype. Run `--check` on its source before publishing, since an app's build is where a refusal would otherwise surface.
- Locales from `arktype/i18n` aren't supported.

## Errors and their fixes

Each build error names the file, line and column, then why, then the fix on its last line. Apply that fix. A bundler stops at the first error, so run `npx arktype-precompile --check "src/**/*.ts"` to see them all. Don't set `allowUnsafe` to get past one, and don't switch to `runtime: "arktype"` unless the program really composes or introspects Types at runtime; that ships arktype's parser again.

| The build says                                                                                                                     | Fix                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `` `limit` is a parameter of makeField ...; its value is known only at runtime ``                                                  | call the helper where that value is known, with it; see the table above                                                                                                                                                                                                                                                                        |
| `T.or reads or, which a standalone validator lacks`                                                                                | compose inside a definition, or make the helper one expression, or consts and one `return`, or a Generic                                                                                                                                                                                                                                       |
| `` `text` (...) is not a static helper: it runs `if (...)` ... ``                                                                  | rewrite the helper's body as one expression, or consts and one `return`                                                                                                                                                                                                                                                                        |
| `` `text` is read outside a call the build precompiles ``                                                                          | call the helper directly, with arguments the build can read                                                                                                                                                                                                                                                                                    |
| `... exports text, a helper the build precompiles at each call, but ... imports it`                                                | call the helper in a `.ts` or `.js` module and import what it returns                                                                                                                                                                                                                                                                          |
| `` `shape` is written at ..., so its value at the site is not known ``                                                             | write the object whole in its literal, or define each variant as its own Type                                                                                                                                                                                                                                                                  |
| `User.description reads description, which a standalone validator lacks`                                                           | read it inside a definition, or set that member under `members`                                                                                                                                                                                                                                                                                |
| `T.default(x) can't be precompiled yet`, `.default() gives the definition of an object's key`                                      | write `.default(x)` at the object key it's for, not in a `const`, as the message shows                                                                                                                                                                                                                                                         |
| `flatProblemsByPath(out) calls flatProblemsByPath, which arktype/runtime doesn't export` (or `byPath`, `flatByPath`)               | read `out.issues`, grouping by `issue.path.join(".")`; for `messageIn`, read `issue.message`                                                                                                                                                                                                                                                   |
| `configure() is called, but the build has no config module`                                                                        | add `"config"` to `ark.json`, as above                                                                                                                                                                                                                                                                                                         |
| `... loads src/schemas.ts, which creates a Type, before the config module ... runs`                                                | import the config module first in that file, before any module that creates a Type                                                                                                                                                                                                                                                             |
| `` `User` comes from `~/schemas`, which the build can't resolve ``                                                                 | add the alias to `tsconfig.json`'s `paths`                                                                                                                                                                                                                                                                                                     |
| `arktype resolves to more than one copy`, or a version mismatch                                                                    | install one version of `arktype`, then clear the bundler's cache                                                                                                                                                                                                                                                                               |
| `my-lib imports arktype, which a standalone build resolves to arktype/runtime`                                                     | set `"precompile": { "dependencies": { "my-lib": "aot" } }`, or `"arktype"` in place of `"aot"` if it creates Types from runtime values                                                                                                                                                                                                        |
| `src/Form.svelte imports arktype, which a standalone build resolves to arktype/runtime`                                            | move the Types, and any code reading `type`, into a `.ts` module the component imports; don't set `allowUnsafe`                                                                                                                                                                                                                                |
| `precompile.esbuild() needs bundle: true`                                                                                          | set `bundle: true`                                                                                                                                                                                                                                                                                                                             |
| `arktype resolves to ... rather than arktype/runtime` (Turbopack)                                                                  | add the `resolveAlias` entries it lists                                                                                                                                                                                                                                                                                                        |
| `type is not a function` at runtime                                                                                                | a module defining Types wasn't precompiled, e.g. no Turbopack rule matches its extension; add one                                                                                                                                                                                                                                              |
| `prune: keeping assert, meta, ~standard and methods, because src/schemas.ts:7:9 reads Title other than to call it ...` (a warning) | the build kept the members it couldn't prove unread, as where a Type is held in an object; the build is correct, only larger. To build without the warning, set each member it names under `members` in `ark.json`, `false` where no code reads it, e.g. `"members": { "assert": false, "meta": false, "~standard": false, "methods": false }` |
| `toJsonSchema isn't baked into this validator, as the build saw no code read it`, at runtime                                       | code the build can't see read it, like code outside the bundle reading an entry's export; set that member true under `members`                                                                                                                                                                                                                 |

Every message and its fix: https://arktype.io/docs/precompile/troubleshooting.md.
