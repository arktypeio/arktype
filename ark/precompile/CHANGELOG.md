# @ark/precompile

## Unreleased

### Precompile packages that opt in

A package whose `package.json` has `"arktype": { "precompile": true }` is precompiled with the program that depends on it: the build follows its modules and folds its definitions like the program's, through the bundler plugin, Vite's dev server and Vitest, and the Node and Bun drivers. A dependency that doesn't opt in is left as before.

```json
{
	"name": "my-schemas",
	"arktype": { "precompile": true }
}
```

### Leave a definition to arktype with `// @ark-runtime`

In a standalone build, a definition after a `// @ark-runtime` comment runs on arktype, which then ships beside the runtime. The build fails if a runtime island reads a precompiled validator other than to validate with it, or reaches arktype outside an island. `--check` lists islands and leaves them out of the rate `--fail-under` compares.

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

### Precompile while bundling

`@ark/precompile/unplugin` replaces each arktype definition with a standalone validator as Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm bundles it, so only arktype's runtime ships. `runtime: "arktype"` ships arktype instead, with precompiled code for each definition and for arktype's keywords in place of `new Function`. Either mode fails the build if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy.

```ts
// vite.config.ts
import { precompile } from "@ark/precompile/unplugin"

export default defineConfig({ plugins: [precompile.vite()] })
```

### Precompile definitions holding functions

In standalone mode, a definition holding a morph, a predicate, a class or a symbol is precompiled to a factory, and the definition becomes a call passing each of those values where it was written, so it is evaluated when the original would have been. The factory checks that each value is what its code was compiled for (a function's parameter count, a class's builtin and other ancestors, a symbol's description) and throws at creation if one isn't, then creates the validator, printing each function's own name in its descriptions and errors.

```ts
const trim = (s: string) => s.trim()
export const Name = type("string").pipe(trim)
// becomes
export const Name = $arkf1j3ffm9dngv(trim)
```

A definition referencing a Type that holds functions receives that Type's validator and takes them from it. A definition reading a value through a binding (an object or a primitive declared in the module, an import, a `define`) receives it after those values and compares it with what the build read before creating anything: a primitive by `Object.is`, an object by its keys in order and then each value, a Type by its content, importing it if the module doesn't. A mismatch throws, naming the value and both readings, so a mocked module, a mutated object or a stubbed define fails at creation rather than validating differently.

A definition that could depend on whether two values imported from other modules are equal is reported rather than precompiled, as is a default whose value is a function or a Module, Scope or Generic read through a binding.

### Precompile in Turbopack

`@ark/precompile/turbopack` is a webpack loader for `turbopack.rules`, reporting each module's forward closure as its dependencies. In standalone mode, alias `arktype` to `arktype/runtime` with `turbopack.resolveAlias`.

```js
// next.config.js
export default {
	turbopack: {
		rules: { "*.js": { loaders: ["@ark/precompile/turbopack"] } },
		resolveAlias: { arktype: "arktype/runtime" }
	}
}
```

### Precompile in Bun

`precompile()` from `@ark/precompile/bun` is a runtime plugin for `Bun.plugin`, so a preload precompiles each module Bun loads, including under `bun test`.

```ts
// preload.ts, listed in bunfig.toml
import { precompile } from "@ark/precompile/bun"

Bun.plugin(precompile())
```

### Precompile in Node

`register()` from `@ark/precompile/node` precompiles each module Node loads, through `module.registerHooks`, so `node --test` runs tests against precompiled code. In standalone mode it resolves `arktype` to `arktype/runtime`. The precompiler runs in a worker thread, so a program's own arktype never sees the Types it builds.

```ts
// register.ts, run with `node --import ./register.ts --test`
import { register } from "@ark/precompile/node"

register({ runtime: "arktype" })
```

### Place precompiled code in each module

`inline: true` places what a module would import from virtual modules, its validators or its cache-mode units, at the top of the module itself, for hosts that have no virtual modules. In cache mode it also imports arktype's keyword table before the module's first import of arktype.

```ts
precompileModule(source, id, host, { inline: true })
```

### Check which definitions can be precompiled

`arktype-precompile --check` reports each arktype definition in a project as accepted or rejected for precompilation, with the chain of reasons for each rejection. `--fail-under` exits with an error below an acceptance rate, and `--runtime arktype` reports without rejecting. The same diagnostics are available in the editor through the ESLint rule `@ark/precompile/precompilable`, exported as `configs.recommended` from `@ark/precompile/eslint`.

```sh
npx arktype-precompile --check "src/**/*.ts" --fail-under 90
```
