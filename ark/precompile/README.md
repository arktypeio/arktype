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

A standalone validator lacks the members that compose a Type, like `.and`, `.or` or `.in`, so reading one outside a definition the build precompiles fails the build. So does reading one off a value the build lost track of after a Type reached it, since the value may be a Type, like `t` in `[A, B].map(t => t.or("null"))`, an instance's field, or a property assigned after its object was written. Where such a value isn't a Type, annotating it with its own type, like `s: JsonSchema`, tells the build so unless it sees a Type reach the value, and casting it, like `o as Endpoint`, tells it so either way. `.map`, `.filter` and `.get`, which arrays and Maps share with a Type, are left to run. So is reading a member the `introspection` option leaves out, like `.expression` or `.json`, off such a value, since the validator throws where it's read. A Type the build never sees reach a value is missed: calling a member it lacks throws, like `def.or("null")` in `export function parse(def: EnvSchema) {}` when another module passes it a Type, and reading one without calling it, like `def.in`, reads `undefined`. The build doesn't see a Type reach a value through `arguments`, a generator, `Reflect.get`, `import()`, a namespace import read at a runtime key or through `Object.values`, a spread of an array it was added to, or a property set on a nested object, on a function or in a class's static block.

A definition holding functions, like a narrow, a morph, a default's thunk or a class, becomes a call to a factory passing each one where the definition was written. The factory checks at creation that each is what its code was compiled for, like a function's parameter count, and throws if not. arktype sorts some branches by the names of the functions they hold, so the factory sorts the functions it receives by name too, as a minifier renames them, and where two are named alike, prints their branches once, as arktype does. A definition holding a function or class a parameter holds is reported, as is one resolving a Scope alias a thunk defines whose Type holds a function, which runs on arktype once the Scope and the definitions reading it are marked [`// @ark-runtime`](#runtime-islands).

A standalone validator has `expression`, `description`, `json`, `toJSON()`, `toJsonSchema()` and `~standard.jsonSchema` only where the `introspection` option lists them. Reading one it lacks throws an error naming the member and the option, and so do converting the validator to a string, which prints its expression, and `JSON.stringify`, which calls its `toJSON()`. The build fails where it sees such a read outside a definition it precompiles, like `String(User)`, `` `${User}` `` or `JSON.stringify(User)`, and a library reading one throws at runtime. Without `~standard.jsonSchema`, `~standard` has no `jsonSchema` key, so libraries that probe for it fall back. Each one listed is baked as arktype returns it under the program's configuration, and `toJsonSchema()` then takes no options but a `target`. A JSON Schema the build can't bake throws where it's read instead: one calling a default's thunk, which arktype calls at each write, or one whose configured writer reads what the program can change or can't be evaluated. A read the build sees, like `User.expression` or `User.toJsonSchema()`, is replaced by what it returns either way.

```ts
precompile.vite({ introspection: ["toJsonSchema", "~standard.jsonSchema"] })
```

A standalone validator returns errors of its own. Each issue holds the failed check's `code`, `path`, `data` and `expected`, what the failing node describes, and a `message` like `name must be a string`, written when the issues are first read. A message doesn't say what the value was, the errors arktype groups at one path stay apart, and a union no branch allows is one issue naming the union's description. `errors: "first"` stops each validation at its first issue:

```ts
precompile.vite({ errors: "first" })
```

`shadow: true` makes a test suite tell where a standalone build would behave otherwise than arktype. Each definition is still precompiled, and also created by arktype from the same values, each function it holds evaluated once and passed to both:

```ts
// vitest.config.ts
export default defineConfig({ plugins: [precompile.vite({ shadow: true })] })
```

The program then runs on arktype: `arktype` resolves to it for every importer, and only `arktype/config` to `arktype/runtime` (so with Turbopack, alias only `arktype/config`). Each Type, Module and `type.fn` a definition returns compares its validator with arktype's:

- as it's created, by whether it throws and its `meta`
- validating, through calling it, `allows`, `assert`, `traverse`, `from` and `~standard.validate`, by result, the input each leaves, the objects each shares, and each call to a function the program passed
- reading `expression`, `description`, `json`, `toJSON()`, `toString()`, `toJsonSchema()` and `~standard.jsonSchema`, and reading any other member arktype has or checking for it with `in`, which the validator must have too, as a Scope's, a Generic's, a Module's and a `type.fn`'s must, its `params` and `returns` compared as Types. `typeof` can't be intercepted, so it gives arktype's answer, like `"function"` for a Generic. Copying a Type's own keys, as a spread or `Object.assign` does, reads each one, so it throws where the validator lacks one

Where they agree, it returns what arktype returns. Where they don't, it throws an error naming the definition, what was observed and both results, and raises it again where the program can't catch it, so a fallback or `expect(...).toThrow()` can't hide it.

During a validation, a function a definition holds runs once: each of the validator's calls is answered from arktype's, with what it wrote to its arguments, or to an object it took from them and returned, or held in a plain object or array it returned, written to the validator's. Only plain writes are written that way: adding, setting or deleting an ordinary key of a plain object or array, with the other keys keeping their order. A call that adds an error to `ctx`, or writes its arguments in any other way, like setting a `Date`'s time, adding to a `Map` or `Set`, freezing an object, moving a key or writing something that can't be copied, runs again for the validator, which must answer alike. These run for each side and aren't compared:

- calls made as a definition is created
- `onFail`, which each side calls with its own errors
- getters and Proxy traps on the input

A callback's write to anything but its arguments, like `ctx.root` or what it closes over, reaches only arktype's input, so where the Type transforms, shadow mode reports the input as diverging. So does a later write through a morph's result that can't be copied, like a class instance holding the input, which the validator receives as arktype's morph returned it.

A morph's input is copied for the validator, except one that can't be copied, like a class instance, which the validator receives as arktype's morphs left it. Comparisons skip private fields and a builtin's internal slots besides a `Date`'s time and a `RegExp`'s or `Error`'s text. Shadow mode is meant for tests.

`precompile.vite({ runtime: "arktype" })` ships arktype and leaves definitions as written, registering the code arktype would compile for each one and the keywords it reaches. A definition the build can't precompile is compiled at runtime as usual, so this mode fails a build only for the reason below.

In either mode, the build fails if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy across the files it reads, naming each copy's version and path and the file that reached it, since Types and errors from one copy aren't recognized by another.

Nothing checks at runtime that a standalone artifact runs on the `arktype/runtime` it was built with, or that `arktype` loads only for runtime islands, so both are requirements. An artifact built with another version calls the runtime as that version did, so it can throw a TypeError or validate otherwise: rebuild it with the installed arktype. A module loading `arktype` outside an island, as one a bundler leaves unresolved can, defines its Types with arktype, under arktype's own configuration unless a runtime island shares the program's.

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

The build evaluates the argument, which must be static, and precompiles every definition under it, so a `description` writer must be a static helper. A locale, or an `expected`, `problem` or `message` for a code a precompiled Type can raise, fails the build, since a standalone validator writes its own messages, and an `actual` writer is unused, since they never say what the value was. `onFail` can be any function: the call stays in the program, where it configures `arktype/runtime` and the arktype runtime islands run on. The runtime fixes its configuration when it creates its first validator and throws if `configure()` runs after that or a second time, or receives other values than a validator was built under. The build stamps a hash of the argument's values into the call and each validator, counting a function only as a function, so a `description` writer a loader or plugin changes after the build read it isn't caught. In standalone mode, `configure()` returns its argument rather than arktype's configuration with the argument merged in.

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
