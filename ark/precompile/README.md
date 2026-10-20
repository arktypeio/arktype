# @ark/precompile

Constructs a program's arktype definitions at build time, so arktype's parser never ships.

## Bundler plugin

`@ark/precompile/unplugin` precompiles a program as Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm bundles it. Vitest runs tests through it too.

```ts
import { precompile } from "@ark/precompile/unplugin"

export default defineConfig({
	plugins: [precompile.vite()]
})
```

By default, each definition becomes a standalone validator and `arktype` resolves to `arktype/runtime`. A definition the build can't precompile fails the build with the reasons why. A dependency that imports arktype gets `arktype/runtime` too, where defining a Type throws, so the build warns once for each such package unless it [opts in](#libraries).

`runtime: "arktype"` ships arktype instead and leaves definitions as written, registering the code arktype would compile for each. A definition the build can't precompile is then compiled at runtime as usual.

In either mode, the build fails if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy, naming each copy and the file that reached it, since one copy doesn't recognize another's Types and errors. It fails too where one resolves to a version other than the one `@ark/precompile` imports, which its validators are written for.

## Checking

`--check` lists the definitions that can't be precompiled, and why:

```sh
npx arktype-precompile --check "src/**/*.ts"
```

```
src/forms.ts:14:19  type(`string <= ${limit}`) cannot be precompiled
  `limit` is a parameter of makeField (src/forms.ts:12:22); its value is known only at runtime
  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".
```

`--fail-under <percent>` exits with 1 if less than that percent of definitions can be precompiled, or on an error outside a definition. The same analysis is available as `new Precompiler(host).analyze(source, id)` and as an ESLint rule:

```js
import { configs } from "@ark/precompile/eslint"

export default [configs.recommended]
```

## Standalone validators

A standalone validator lacks the members that compose a Type, like `.and` or `.in`, so the build fails where it sees one read outside a definition it precompiles, including off a value it lost track of after a Type reached it. It warns, once for each import, where it sees one read off an import it can't resolve, like one only a bundler alias names. Annotate such a value with its own type (`s: JsonSchema`) or cast it to say it isn't a Type.

A definition holding functions, like a narrow, a morph or a class, becomes a call to a factory passing each one where the definition was written. The factory checks at creation that each class, and each function another module supplies, is what its code was compiled for, and throws if not. A definition whose branches arktype orders by the names of the functions they hold, like `type.instanceOf(Cat).or(type.instanceOf(Dog))`, is reported, since a minifier can rename them.

A standalone validator returns errors of its own, instances of `type.errors` and of `arktype`'s `ArkErrors`, but not of `@ark/schema`'s, so the build fails where a module imports that one. Each issue holds the failed check's `code`, `path`, `data`, `expected` and a `message` like `name must be a string`. A message doesn't say what the value was, and the errors arktype groups at one path stay apart.

Nothing checks at runtime that a build runs on the `arktype/runtime` it was built with, or that `arktype` loads only for [runtime islands](#runtime-islands): rebuild with the installed arktype after upgrading.

### Limits

- The build doesn't see a Type reach a value through `arguments`, a generator, `Reflect.get`, `import()` or a namespace read at a runtime key, nor a direct `eval` or `with` changing a binding a definition reads.
- A Type it never sees reach a value is missed: calling a member it lacks throws, and reading one reads `undefined`.
- A union whose branches print alike once their functions are named prints as `X or X` where arktype prints `X`.
- A Date or RegExp a Type holds is one object for every Type and validation holding it.
- A builtin class a Type holds, like `Uint8Array`, is read as the validator's module loads, so a later polyfill isn't seen.
- A definition holding a function a parameter holds, or resolving a Scope alias a thunk defines whose Type holds one, is reported; mark it [`// @ark-runtime`](#runtime-islands).

## Options

Each takes effect in standalone mode alone, so setting one with `runtime: "arktype"` fails the build. `--check` takes each that changes what a build refuses, like `--members '{"assert":false}'`.

`members` decides what a validator has besides validating. `assert`, `meta`, `~standard` and `methods` (`traverse()`, `from()` and `toString()`) default to true; `expression`, `description`, `json`, `toJSON`, `toJsonSchema` and `~standard.jsonSchema` default to false. A dropped member reads `undefined`, and the build fails where it sees the program read one, like `User.assert(data)` or `String(User)`.

Each introspection member set true is baked as arktype returns it under the program's configuration, and `toJsonSchema()` then takes only a `target`. A JSON Schema the build can't bake throws where it's read. A read the build sees, like `User.expression`, is replaced by its value either way.

```ts
precompile.vite({
	members: { assert: false, toJsonSchema: true, "~standard.jsonSchema": true }
})
```

`errors: "first"` stops each validation at its first issue. `errors: "none"` returns errors holding one root issue with the code `"predicate"` and the message `is invalid`, so no check's description or message ships. Those errors have no `throw()`, and `assert` throws a plain `Error` whose `cause` is the errors.

The plugin and the Node and Bun drivers resolve `@ark/schema/runtime` to `@ark/schema/runtime/none` under `errors: "none"`, and a module importing any other `@ark/schema` entry, or a runtime island, fails the build. Turbopack needs an alias:

```js
resolveAlias: { "@ark/schema/runtime": "@ark/schema/runtime/none" }
```

`mutatesInput: true` or `"always"` writes what a validation transforms into its input and returns it, as [arktype's option](https://arktype.io/docs/configuration#mutatesinput) does.

`freeze: false` leaves validators and their members unfrozen. Otherwise, writing to one throws in strict mode code.

`lazy: false` creates each validator as its module loads rather than where it's first read, so an error creating one throws on import.

`checks` decides what a factory checks of what it receives: `"types"` checks each Type, Module, Scope and Generic is the one the build read, `"helpers"` each static helper too, as under a test runner's driver, and `"none"` only those holding functions, so a module mock replacing any other goes unnoticed.

`config: false` says the program never calls `configure()`, so the build fails wherever it does.

`optimize: "size"` writes validators for size rather than speed. Validators are then slower, most where one calls several others in turn, so prefer it where bundle size matters more than validation speed.

`conditions` and `tsconfig` set the export conditions and the tsconfig whose `paths` the build resolves imports with.

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

The build evaluates the argument, which must be static, and precompiles every definition under it. A locale, or an `expected`, `problem` or `message` for a code a precompiled Type can raise, fails the build, since a standalone validator writes its own messages. `onFail` can be any function. The build warns where a module imports one that creates a Type before the config module, and the runtime throws if `configure()` runs after it creates its first validator, runs twice, or receives other values than the build read.

A program configuring `errors` or `mutatesInput`, globally or for a Scope, builds with the same value: a definition whose Types are configured otherwise fails the build, naming both.

## Shadow mode

`shadow: true` makes a test suite tell where a standalone build would behave otherwise than arktype. Each definition is precompiled and also created by arktype from the same values, and the program runs on arktype, only `arktype/config` resolving to the runtime:

```ts
// vitest.config.ts
export default defineConfig({ plugins: [precompile.vite({ shadow: true })] })
```

Each Type, Module and `type.fn` compares its validator with arktype's as it's created, as it validates (by result, the input it leaves and each call to a function the program passed) and as its members are read. Where they agree, it returns arktype's result. Where they don't, it throws an error naming the definition, what was observed and both results, and raises it again where a fallback or `expect(...).toThrow()` can't catch it.

During a validation, each function a definition holds runs once, its calls and plain writes to its arguments replayed for the validator. A call that adds an error to `ctx` or writes otherwise, like setting a `Date`'s time, runs again for the validator, which must answer alike.

## Libraries

A library ships its source, and the build precompiles it with the program if its `package.json` opts in:

```json
{
	"name": "my-schemas",
	"arktype": { "precompile": true }
}
```

Its definitions are then precompiled like the program's. The plugin and drivers find such packages through the dependencies of the nearest `package.json` to `cwd` and of each package that opts in, and the plugin keeps Vite and Vitest from prebundling or externalizing them. A library shouldn't ship what its own build precompiled, which runs only on the arktype it was built with, so the plugin warns once for each dependency that imports `arktype/runtime`.

## Runtime islands

In a standalone build, a definition can be left to arktype by marking it:

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

The marker applies to the statement or expression after it. arktype then ships beside `arktype/runtime` for the modules with islands alone. The build fails if an island reads a precompiled validator other than to validate with it, or reaches arktype outside an island, e.g. through a helper in another module. `--check` leaves islands out of its rate.

## Declarations

A package whose types others read can declare its Types once, so its consumers don't infer arktype definitions:

```sh
npx arktype-precompile --declare
```

This writes what `tsc --emitDeclarationOnly` would for the nearest `tsconfig.json`, or the one `--tsconfig` names, except that each Type, Scope and Module is declared through its shape in one `~arktype.d.ts` at the declarations' root, named once and referenced wherever another shape holds it:

<!-- prettier-ignore -->
```ts
// users.d.ts
export declare const User: import("arktype").Type<import("./~arktype.js").User>;

// ~arktype.d.ts
export type User = {
    id: string;
    role: import("arktype").Default<Role, "member">;
    address?: Address | undefined;
};
```

A consumer's type-check then reads each Type's shape rather than inferring its definition. A shape TypeScript can't name where a consumer resolves it, like a class its module doesn't export, is left to TypeScript's own declaration. The CLI exits with 1 where TypeScript reports an error, after writing what it emitted.

The bundler plugin emits the same files with a Rollup, Rolldown, Vite, webpack, Rspack or Rsbuild build that neither watches nor serves:

```ts
precompile.vite({ declare: true })
```

esbuild, Bun, Farm and the Node and Turbopack drivers can't tell whether a build watches, so `declare: true` throws there; run `arktype-precompile --declare` after the build instead.

Declarations read the compiler API of TypeScript 5.5 to 6 from the optional `typescript` peer. A TypeScript 7 project installs TypeScript 6 beside it:

```sh
npm i -D typescript-6@npm:typescript@6
```

## Test runners and runtimes

Each driver takes the plugin's options, fails on the same errors and, in standalone mode, resolves `arktype` to `arktype/runtime` where its host allows. The precompiler runs in a worker thread, sharing no module state with the program.

Node 22.15 or later, for `node --test` or any program (pass `--enable-source-maps` for original lines in stack traces):

```ts
// register.ts, run with `node --import ./register.ts --test`
import { register } from "@ark/precompile/node"

register()
```

Bun, for `bun test` or any program, from a file listed in `preload` in `bunfig.toml`:

```ts
import { precompile } from "@ark/precompile/bun"

Bun.plugin(precompile())
```

Bun doesn't ask a runtime plugin to resolve packages, so `arktype` is replaced by the runtime `cwd` resolves for every importer, and dependencies aren't checked for copies of arktype.

Turbopack, as a webpack loader in a rule for each extension your definitions and config module are in. It reruns the loader when a module's local imports change, and applies a changed configuration once the dev server restarts:

```js
// next.config.js
export default {
	turbopack: {
		rules: { "*.js": { loaders: ["@ark/precompile/turbopack"] } },
		// standalone mode only
		resolveAlias: {
			arktype: "arktype/runtime",
			"arktype/config": "arktype/runtime",
			"arktype/errors": "arktype/runtime",
			"arktype/mutatesInput": "arktype/runtime"
		}
	}
}
```

The loader fails a module where Turbopack resolves `arktype` otherwise than this needs.
