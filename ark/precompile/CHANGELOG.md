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

In a standalone build, a definition after a `// @ark-runtime` comment runs on arktype, which then ships beside the runtime. The build fails if a runtime island reads a precompiled validator other than to validate with it, or reaches arktype outside an island. A package that reads arktype's nodes, like `arksets`, `@ark/schema` or `@ark/json-schema`, must be used in an island too, since a standalone build replaces them with validators. `--check` lists islands and leaves them out of the rate `--fail-under` compares.

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

### Precompile while bundling

`@ark/precompile/unplugin` replaces each arktype definition with a standalone validator as Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm bundles it, so only arktype's runtime ships. `runtime: "arktype"` ships arktype instead, with precompiled code for each definition and for arktype's keywords in place of `new Function`. Either mode fails the build if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy. A program's `configure()` call, in the module the `config` option names, applies to both: the build precompiles every definition under it, and in standalone mode the call configures `arktype/runtime`.

A definition is the largest expression composing an arktype value, which the build follows from arktype's exports through bindings, imports, namespaces, object literals and what functions return, past casts and optional chains. A member a standalone validator has, like `.expression` or `.assert`, ends it, so reading one runs at runtime. In a standalone build, reading one it lacks, like `.and`, `.in` or `.json`, outside any definition the build can precompile fails the build rather than throwing or reading `undefined` at runtime, as does reflecting on a Type there, like `JSON.stringify(T)`, `Object.keys(T)` or `{ ...T }`.

```ts
// vite.config.ts
import { precompile } from "@ark/precompile/unplugin"

export default defineConfig({ plugins: [precompile.vite()] })
```

### Precompile definitions holding functions

In standalone mode, a definition holding a morph, a predicate, a default's function, a class or a symbol is precompiled to a factory, and the definition becomes a call passing each of those values where it was written, so it is evaluated when the original would have been. The factory checks that each value is what its code was compiled for (a function's parameter count, a class's builtin and other ancestors, a symbol's description), and that a value the definition reads through two expressions, or that a Type it references also holds, is still one value, and throws at creation if not, then creates the validator, printing each function's own name in its descriptions and errors. Functions one expression created, like those of a predicate factory called twice, share the name it prints, so the factory checks they are named alike.

```ts
const trim = (s: string) => s.trim()
export const Name = type("string").pipe(trim)
// becomes
export const Name = $arkf1j3ffm9dngv(trim)
```

A default is applied as arktype applies it, through its value's validator, so a default its value transforms and the `[]` or `{}` a string default parses to are precompiled too.

A definition referencing a Type that holds functions receives that Type's validator and takes them from it. A definition reading a value through a binding (an object or a primitive declared in the module, an import, a `define`) receives it after those values and compares it with what the build read before creating anything: a primitive by `Object.is`, an object by its keys in order and then each value, a Type by its content, importing it if the module doesn't. A mismatch throws, naming the value and both readings, so a mocked module, a mutated object or a stubbed define fails at creation rather than validating differently.

A definition calling a static helper (a function whose body is one expression) is precompiled with what the helper returned at build. Vitest through the plugin, `node --test` through `register()` and `bun test` through the Bun plugin replace whole modules when they mock one, so under them each module registers the functions it exports, and a definition calling a helper another module exports checks at creation that it received the registered function: a mock is another function, and a module the runner replaced registered nothing. `checkHelpers` sets this outside those runners, or turns it off; `bun test` is recognized by the `NODE_ENV` it sets, so a suite setting its own passes `checkHelpers: true`.

A definition in a function, a loop's body or an instance's field runs each time they do, and arktype creates a new Scope, Module or Generic each time, and a new Type when its Scope is new. Such a definition is precompiled to a factory taking nothing, so each run creates new validators from the same code and its values are distinct where arktype's are.

These definitions are reported rather than precompiled:

- one that could depend on two values imported from other modules being distinct;
- one arktype creates anew each time it runs, holding a value that is the same each time or that another definition holds too, like `$.export()` in a function when `$` is not;
- a Module, Scope or Generic read through a binding;
- one reading a function only through a binding it declares itself, such as a callback's parameter;
- one throwing a ParseError that reads a binding, or holds or calls a function, itself or through any value it passes to arktype;
- one throwing a ParseError another definition threw, such as a runtime island it reads;
- one whose code sees a function's name in what arktype prints, such as a `where` selector or description writer reading a predicate's `expression`, or a `JSON.stringify` replacer receiving a Type's JSON.

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
