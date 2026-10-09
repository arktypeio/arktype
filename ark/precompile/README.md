# @ark/precompile

Finds the arktype definitions in a program that can be constructed at build time, and explains why the others cannot.

```sh
npx arktype-precompile --check "src/**/*.ts"
```

```
src/forms.ts:14:19  type(`string <= ${limit}`) cannot be precompiled
  `limit` is a parameter of makeField (src/forms.ts:12:22); its value is known only at runtime
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".
```

The same analysis is available as `new Precompiler(host).analyze(source, id)` and as an ESLint rule:

```js
import { configs } from "@ark/precompile/eslint"

export default [configs.recommended]
```

## Bundler plugin

`@ark/precompile/unplugin` precompiles a program as it is bundled by Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm. Vitest runs tests through it too.

```ts
import { precompile } from "@ark/precompile/unplugin"

export default defineConfig({
	plugins: [precompile.vite()]
})
```

By default, each definition becomes a standalone validator and `arktype` resolves to `arktype/runtime`, so arktype's parser never ships. A definition that holds a function, reads a value from another module or calls a static helper can't be precompiled this way yet, and fails the build with the reasons why. A dependency that imports arktype gets `arktype/runtime` too, where defining a Type throws, so the build warns once for each such package.

`precompile.vite({ runtime: "arktype" })` ships arktype and leaves definitions as written, registering the code arktype would compile for each one, and for arktype's keywords before arktype loads. A definition the build can't precompile is compiled at runtime as usual, so this mode fails a build only for the reason below.

In either mode, the build fails if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy across the files it reads, naming each copy's version and path and the file that reached it, since Types and errors from one copy aren't recognized by another.

## Runtime islands

In a standalone build, a definition can be left to arktype by marking it:

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

The marker applies to the statement or expression that starts after it. arktype then ships beside `arktype/runtime`, and each module with an island imports it for its islands alone, so `arktype` still resolves to the runtime everywhere else. The build fails if an island reads a precompiled validator other than to validate with it, as in `User(data)` or `User.assert(data)`, or reaches arktype outside an island, e.g. through a helper in another module, whose definition must then be marked too. `--check` lists islands apart from the sites it precompiles and leaves them out of the rate `--fail-under` compares. With `runtime: "arktype"`, the marker means nothing.

## Test runners and runtimes

Where there are no virtual modules, the validators or units a module needs are placed at the top of the module itself. Each driver takes the plugin's options, fails on the same errors and resolves `arktype` to `arktype/runtime` in standalone mode where its host allows.

Node, for `node --test` or any program (Node 22.15 or later):

```ts
// register.ts, run with `node --import ./register.ts --test`
import { register } from "@ark/precompile/node"

register()
```

The precompiler runs in a worker thread, so it shares no module state with the program. Pass `--enable-source-maps` for stack traces to point at the original lines.

Bun, for `bun test` or any program, from a file listed in `preload` in `bunfig.toml`:

```ts
import { precompile } from "@ark/precompile/bun"

Bun.plugin(precompile())
```

The precompiler runs in a worker here too. Bun doesn't ask a runtime plugin to resolve packages, so in standalone mode `arktype` is replaced by `arktype/runtime` for every importer, and dependencies aren't checked for copies of arktype. Bun ignores the source map, so stack traces show lines of the transformed module.

Turbopack, as a webpack loader in a rule for each extension your definitions are in:

```js
// next.config.js
export default {
	turbopack: {
		rules: { "*.js": { loaders: ["@ark/precompile/turbopack"] } },
		// standalone mode only
		resolveAlias: { arktype: "arktype/runtime" }
	}
}
```

The loader reports each module's forward closure as its dependencies, so Turbopack reruns it when one of them changes.
