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

By default, each definition becomes a standalone validator and `arktype` resolves to `arktype/runtime`, so arktype's parser never ships. A definition the build can't precompile this way fails the build with the reasons why. A dependency that imports arktype gets `arktype/runtime` too, where defining a Type throws, so the build warns once for each such package unless it [opts in](#libraries).

A definition holding functions, like a narrow, a morph, a default's thunk or a class, becomes a call to a factory passing each one where the definition was written. The factory checks at creation that each is what its code was compiled for, like a function's parameter count, and throws if not. arktype sorts some branches by the names of the functions they hold, so the factory sorts the functions it receives by name too, as a minifier renames them, and where two are named alike, prints their branches once, as arktype does. A function a parameter holds is compiled for each parameter count arktype tells apart, and the factory selects the variant matching the function it receives. A definition needing more variants than `maxVariants`, 8 by default, is reported, as is one resolving a Scope alias a thunk defines whose Type holds a function, which runs on arktype once the Scope and the definitions reading it are marked [`// @ark-runtime`](#runtime-islands).

```ts
precompile.vite({ maxVariants: 16 })
```

A standalone validator lacks `json`, `toJSON()`, `toJsonSchema()` and `~standard.jsonSchema` unless the `introspection` option lists them, so reading one the build doesn't see reads `undefined`, and `JSON.stringify` skips the validator. Each one listed is baked as arktype returns it under the program's configuration, and `toJsonSchema()` then takes no options but a `target`. A read the build sees, like `User.toJsonSchema()`, is replaced by what it returns either way.

```ts
precompile.vite({ introspection: ["toJsonSchema", "~standard.jsonSchema"] })
```

`shadow: true` makes a test suite tell where a standalone build would behave otherwise than arktype. Each definition is still precompiled, and also created by arktype from the same values, each function it holds evaluated once and passed to both:

```ts
// vitest.config.ts
export default defineConfig({ plugins: [precompile.vite({ shadow: true })] })
```

The program then runs on arktype: `arktype` resolves to it for every importer, and only `arktype/config` to `arktype/runtime` (so with Turbopack, alias only `arktype/config`). Each Type, Module and `type.fn` a definition returns compares its validator with arktype's:

- as it's created, by whether it throws, its `expression`, `description` and `meta`
- validating, through calling it, `allows`, `assert`, `traverse`, `from` and `~standard.validate`, by result, the input each leaves, the objects each shares, and each call to a function the program passed
- reading `json`, `toJSON()`, `toString()`, `toJsonSchema()` and `~standard.jsonSchema`, and any other member arktype has, which the validator must have too

Where they agree, it returns what arktype returns. Where they don't, it throws an error naming the definition, what was observed and both results.

During a validation, a function the program passed runs once: the validator's calls are answered from arktype's, unless a call wrote an argument or added an error to `ctx`, which then runs again for the validator. It runs for both as a definition is created, and an error writer in `meta` runs for both as their errors are compared.

A morph's input is copied for the validator, except one that can't be copied, like a class instance, which the validator receives as arktype's morphs left it. Comparisons skip private fields and a builtin's internal slots besides a `Date`'s time and a `RegExp`'s or `Error`'s text. Shadow mode is meant for tests.

`precompile.vite({ runtime: "arktype" })` ships arktype and leaves definitions as written, registering the code arktype would compile for each one and the keywords it reaches. A definition the build can't precompile is compiled at runtime as usual, so this mode fails a build only for the reason below.

In either mode, the build fails if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy across the files it reads, naming each copy's version and path and the file that reached it, since Types and errors from one copy aren't recognized by another.

## Configuration

A program that calls `configure()` does so once, in a module imported before any that defines a Type, and names it as the build's `config`:

```ts
// config.ts
import { configure } from "arktype/config"

configure({
	onUndeclaredKey: "delete",
	onFail: errors => errors.throw()
})
```

```ts
precompile.vite({ config: "./config.ts" })
```

The build evaluates the argument, which must be static, and precompiles every definition under it, so a `description` writer must be a static helper. Other writers and `onFail` can be any function: the call stays in the program, where it configures `arktype/runtime` and the arktype runtime islands run on. The runtime fixes its configuration when it creates its first validator and throws if `configure()` runs after that or a second time, or receives other values than a validator was built under. The build stamps a hash of the argument's values into the call and each validator, counting a function only as a function, so a `description` writer a loader or plugin changes after the build read it isn't caught. In standalone mode, `configure()` returns its argument rather than arktype's configuration with the argument merged in.

The precompiler applies the configuration to arktype in its own thread, so each driver runs it in a worker. The Turbopack loader applies it where Turbopack runs the loader, so a change to the configuration applies once the dev server restarts.

## Libraries

A library ships its source, and the build precompiles it with the program if its `package.json` opts in:

```json
{
	"name": "my-schemas",
	"arktype": { "precompile": true }
}
```

Its definitions then fold like the program's and its static helpers are static. The plugin transforms its modules, and tells Vite and Vitest not to prebundle or externalize it, as do the Node and Bun drivers. They find such packages through the dependencies declared by the nearest `package.json` to `cwd`, and by each package that opts in. A dependency that doesn't opt in isn't read.

## Runtime islands

In a standalone build, a definition can be left to arktype by marking it:

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

The marker applies to the statement or expression that starts after it. arktype then ships beside `arktype/runtime`, and each module with an island imports it for its islands alone, so `arktype` still resolves to the runtime everywhere else. The build fails if an island reads a precompiled validator other than to validate with it, as in `User(data)` or `User.assert(data)`, or reaches arktype outside an island, e.g. through a helper in another module, whose definition must then be marked too. `--check` lists islands apart from the sites it precompiles and leaves them out of the rate `--fail-under` compares. With `runtime: "arktype"`, the marker means nothing.

## Test runners and runtimes

In standalone mode, the Node and Bun drivers serve the `~arktype/` modules a module shares with others, as the plugin does. Where there are no virtual modules, as with Turbopack, `inline: true` and cache mode, the validators or units a module needs are placed at the top of the module itself. Each driver takes the plugin's options, fails on the same errors and resolves `arktype` to `arktype/runtime` in standalone mode where its host allows.

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

The precompiler runs in a worker here too. Bun doesn't ask a runtime plugin to resolve packages, so in standalone mode `arktype` and `arktype/runtime` are replaced by the runtime `cwd` resolves for every importer, including the modules the driver serves, and dependencies aren't checked for copies of arktype. Bun ignores the source map, so stack traces show lines of the transformed module.

Turbopack, as a webpack loader in a rule for each extension your definitions and config module are in:

```js
// next.config.js
export default {
	turbopack: {
		rules: { "*.js": { loaders: ["@ark/precompile/turbopack"] } },
		// standalone mode only
		resolveAlias: {
			arktype: "arktype/runtime",
			"arktype/config": "arktype/runtime"
		}
	}
}
```

The loader reports each module's forward closure as its dependencies, so Turbopack reruns it when one of them changes.
