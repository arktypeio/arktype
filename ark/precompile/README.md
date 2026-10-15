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

A standalone validator lacks the members that compose a Type, like `.and`, `.or` or `.in`, so reading one outside a definition the build precompiles fails the build. So does reading one off a value the build lost track of after a Type reached it, since the value may be a Type, like `t` in `[A, B].map(t => t.or("null"))`, an instance's field, or a property assigned after its object was written. Where such a value isn't a Type, annotating it with its own type, like `s: JsonSchema`, tells the build so unless it sees a Type reach the value, and casting it, like `o as Endpoint`, tells it so either way. `.map`, `.filter` and `.get`, which arrays and Maps share with a Type, are left to run. So is reading a member the `members` option leaves out, like `.expression` or `.json`, off such a value, which reads `undefined` off a validator. A Type the build never sees reach a value is missed: calling a member it lacks throws, like `def.or("null")` in `export function parse(def: EnvSchema) {}` when another module passes it a Type, reading one without calling it, like `def.in`, reads `undefined`, and writing to it, which the runtime freezes, throws in strict mode code and is ignored outside it. The build doesn't see a Type reach a value through `arguments`, a generator, `Reflect.get`, `import()`, a namespace import read at a runtime key or through `Object.values`, a spread of an array it was added to, or a property set on a nested object, on a function or in a class's static block, nor a direct `eval` or a `with` block changing a binding a definition reads, which it folds as declared.

A definition holding functions, like a narrow, a morph, a default's thunk or a class, becomes a call to a factory passing each one where the definition was written. The factory checks at creation that each class, and each function another module supplies, is what its code was compiled for, like a function's parameter count, and throws if not. A definition whose branches arktype orders by the names of the functions they hold, like `type.instanceOf(Cat).or(type.instanceOf(Dog))`, is reported, since a program or a minifier can rename them. A validator can still differ from arktype's in what the factory doesn't check: a union whose branches print alike once their functions are named, as two anonymous narrows do, prints as `X or X` where arktype prints `X`; a Date or RegExp a Type holds, like an example, is one object for every Type and run holding it, so a write into it, as `setTime` or a global RegExp's `exec` makes, is seen by each; a mock making two functions of other modules one leaves both in the validator, where arktype keeps one; and a builtin class a Type holds, like `Uint8Array`, is read as the validator's module loads, so a polyfill or stub replacing it later isn't seen. A definition holding a function or class a parameter holds is reported, as is one resolving a Scope alias a thunk defines whose Type holds a function, which runs on arktype once the Scope and the definitions reading it are marked [`// @ark-runtime`](#runtime-islands).

A standalone validator has `expression`, `description`, `json`, `toJSON()`, `toJsonSchema()` and `~standard.jsonSchema` only where the `members` option sets them true. Reading one it lacks reads `undefined`, so converting the validator to a string, which prints its expression, gives `Type<undefined>`, and `JSON.stringify`, which calls its `toJSON()`, drops it. The build fails where it sees such a read outside a definition it precompiles, like `String(User)`, `` `${User}` `` or `JSON.stringify(User)`, and a library reading one reads `undefined`. Without `~standard.jsonSchema`, `~standard` has no `jsonSchema` key, so libraries that probe for it fall back. Each one listed is baked as arktype returns it under the program's configuration, and `toJsonSchema()` then takes no options but a `target`. A JSON Schema the build can't bake throws where it's read instead: one calling a default's thunk, which arktype calls at each write, or one whose configured writer reads what the program can change or can't be evaluated. A read the build sees, like `User.expression` or `User.toJsonSchema()`, is replaced by what it returns either way.

```ts
precompile.vite({
	members: { toJsonSchema: true, "~standard.jsonSchema": true }
})
```

A standalone validator returns errors of its own. Each issue holds the failed check's `code`, `path`, `data` and `expected`, what the failing node describes, and a `message` like `name must be a string`, written when the issues are first read. A message doesn't say what the value was, the errors arktype groups at one path stay apart, and a union no branch allows is one issue naming the union's description. The errors are instances of `type.errors` and of `ArkErrors` from `arktype`, but not of `@ark/schema`'s `ArkErrors`, arktype's own subclass, so the build fails where a module imports that one, and a dependency the build doesn't read that imports it doesn't recognize them. `errors: "first"` stops each validation at its first issue:

```ts
precompile.vite({ errors: "first" })
```

`shadow: true` makes a test suite tell where a standalone build would behave otherwise than arktype. Each definition is still precompiled, and also created by arktype from the same values, each function it holds evaluated once and passed to both:

```ts
// vitest.config.ts
export default defineConfig({ plugins: [precompile.vite({ shadow: true })] })
```

The program then runs on arktype: `arktype` resolves to it for every importer, and only `arktype/config` to `arktype/runtime` (so with Turbopack, alias only `arktype/config`). Each Type, Module and `type.fn` a definition returns compares its validator with arktype's:

- as it's created, by whether it throws and its `meta`, but for a keyword's, which its validator doesn't bake, so reading it throws
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

## Smaller validators

A standalone build can leave out what a program doesn't need of a validator, each option giving up one thing it could see. They take effect in standalone mode alone, so building with `runtime: "arktype"` and any of them set, even to its default, fails. `--check` takes each that changes what a build refuses, like `--members '{"assert":false}'`.

A validator has `assert`, `meta`, `~standard`, and the methods it inherits, `traverse()`, `from()` and `toString()`, unless `members` sets them false. The build fails where it sees a program read one it drops, like `User.assert(data)` or `String(User)`, and a library reading one reads `undefined`, or the text of the function for `toString()`. A validator the runtime reads keeps every member: a default's value its morph transforms through, and a `type.fn`'s parameters and return.

```ts
precompile.vite({
	members: { assert: false, meta: false, "~standard": false, methods: false }
})
```

A validator and its members are frozen, so a program writing to one throws in strict mode code, unless `freeze` is false.

`config: false` says the program never calls `configure()`, so the build fails wherever it does, and a validator neither fixes the configuration as it's created nor reads the configured `onFail`. A library calling `configure()` as the program runs is then neither caught nor applied.

`lazy: false` creates each validator as the module defining it loads, where it imports arktype, rather than where a site first reads it. An error creating one then throws on import, as one created before `configure()` runs does where the module imports arktype before the config module. A module an import cycle can reach before it loads still creates them as they're read.

A factory checks that each Type, Module, Scope and Generic it receives is the one the build read, and that each static helper it calls is too where `checks` is `"helpers"`, as under a test runner's driver. `checks: "none"` checks only those holding functions, which it takes from them, so a module mock replacing any other goes unnoticed.

`mutatesInput: true` writes what a validation transforms into its input, its defaults and its morphed values, and returns the input rather than a copy. The output keeps what a copy wouldn't, like the order of its keys, its accessors and the keys it inherits, and writing an input that can't be written, like a frozen object, throws a TypeError. A Type deleting undeclared keys from a plain object still returns a new one holding its declared keys, which V8 reads faster than one keys were deleted from. A validation that fails can leave some of its writes. A key one constraint transforms in place before another transforms it, like a property whose defaults an index signature then transforms, fails the build, as the second must read the value as the first received it where it rejects what the first wrote.

An object the input holds at two places it transforms is transformed once where one cyclic Type transforms it at both, and both places hold its output. Anywhere else, as where it holds itself outside a cyclic Scope, the validation throws rather than read what another place wrote. One holding itself through a cyclic Scope is output as a new object holding its keys, which its cycle then reaches. A validation that fails can instead return an issue another place's transform caused, or miss one it hid, but throws rather than return none. A morph receiving an object, a Type piped one and a union telling its branches apart by what an object it receives holds, like `{ inner: { kind: "'a'" } } | { inner: { kind: "'b'" } }`, would read what a transform before them wrote, so they fail the build unless nothing is transformed before them, as at the start of the Type or of the first key it transforms, or where they receive what a morph returned from a value that isn't an object, like `string.json.parse`.

`errors: "none"` makes a failed validation return errors holding one issue, at the root, with the code `"predicate"`, the data and the message `is invalid`, so a validator ships no check's description or message, and a function a definition holds isn't called again to find what failed, as arktype calls it. An issue below the root, which a callback can read from the traversal it receives, says only `is invalid` too. Those errors have no `throw()`, so an `onFail` calling it fails, and `assert` throws a plain `Error` saying `is invalid` whose `cause` is the errors, so nothing a validator throws is a `TraversalError`. The validators run on `@ark/schema/runtime/none`, a copy of `@ark/schema`'s runtime whose errors are a class of its own, which the plugin and the Node and Bun drivers resolve `@ark/schema/runtime` to for every importer. A module importing any other entry of `@ark/schema`, whose errors the copy's aren't instances of, fails the build, as does a runtime island, whose errors are arktype's. Bun, which names no importer to a runtime plugin, fails only a module importing `@ark/schema` itself, as it loads. Shadow mode, a dev server prebundling dependencies without the plugin, and Turbopack without the alias below keep `@ark/schema`'s runtime, whose errors hold the same issue and have `throw()`, so `assert` throws a `TraversalError`. Turbopack fails no module importing another entry:

```js
resolveAlias: { "@ark/schema/runtime": "@ark/schema/runtime/none" }
```

`optimize: "size"` writes validators for size rather than speed. Their functions compile as they're first called rather than as their module loads, validators whose root applies are written alike share one, which each validator calls from a closure of `length` 2, a traversal leaves out a `ctx` it doesn't read, and in the modules the plugin and drivers write, a unit's traversals are declared at the top level of its module rather than returned by a function. A validation returns the same, running more instructions, as the benchmarks count them:

- a site calling several validators in turn, 49% more, as V8 can't inline what the closure and root apply they share call
- bundled by esbuild, which turns `const` at a module's top level into `var`, which V8 optimizes less, up to 9% more where data is valid and 22% where it isn't. Rolldown keeps `const`, as Rollup does, so every other call runs within 5% of `"speed"`
- loaded unbundled, as the Node driver loads them, where a traversal another module declares is read through its import, up to 36% more
- loading and a first call, up to 30% more with Node's compile cache, which then holds less, and from 6% fewer to 2% more without it

What each option saves of the bundles arktype benchmarks, minified and gzipped, in bytes:

| option                            | gives up                                   | login      | moltar     | shop         |
| --------------------------------- | ------------------------------------------ | ---------- | ---------- | ------------ |
| `errors: "none"`                  | what each issue says of what failed        | 1564 / 613 | 2110 / 690 | 12854 / 2941 |
| `members: { assert: false }`      | `assert`                                   | 57 / 19    | 57 / 18    | 51 / 19      |
| `members: { meta: false }`        | `meta`                                     | 75 / 31    | 75 / 29    | 271 / 38     |
| `members: { "~standard": false }` | `~standard`                                | 123 / 53   | 123 / 56   | 115 / 49     |
| `members: { methods: false }`     | `traverse()`, `from()` and `toString()`    | 235 / 88   | 235 / 93   | 63 / -14     |
| `freeze: false`                   | validators and their members frozen        | 29 / 8     | 29 / 9     | 21 / 2       |
| `config: false`                   | calling `configure()`                      | 98 / 36    | 98 / 38    | 195 / 51     |
| `lazy: false`                     | creating a validator where it's first read | 16 / 9     | 16 / 8     | 292 / 96     |
| `checks: "none"`                  | checking the Types a factory receives      | 97 / 50    | 97 / 49    | 1581 / 734   |
| `mutatesInput: true`              | the input left as it was                   | 0 / 0      | 0 / 0      | 2883 / 881   |
| `optimize: "size"`                | validating and loading as fast             | 107 / 42   | 133 / 67   | 2793 / 528   |

Every option together leaves them 1219 / 687, 1370 / 678 and 9917 / 3650 bytes, from 3550 / 1701, 4219 / 1772 and 30827 / 8954.

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

## Declarations

A package whose types other packages read can declare its Types once, so its consumers don't infer arktype definitions:

```sh
npx arktype-precompile --declare
```

This writes what `tsc --emitDeclarationOnly` would for the nearest `tsconfig.json`, or the one `--tsconfig` names, laid out as tsc lays it out. The difference is that each Type, Scope and Module is declared through its shape in one `~arktype.d.ts` at the root of the declarations (`declarationDir`, `outDir`, `rootDir` or the tsconfig's directory), named once and referenced wherever another shape holds it:

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

A shape is named for the const that defines it, and a cycle for the key that first reached it, with a `$` before a name a type couldn't take, like `$string`. An enum is named rather than its values, and `exactOptionalPropertyTypes` is honored. The CLI exits with 1 where TypeScript reports an error, after writing what it emitted.

The bundler plugin emits the same files beside the bundle of a build that neither watches nor serves, with Rollup, Rolldown, Vite, webpack, Rspack and Rsbuild:

```ts
precompile.vite({ declare: true })
```

esbuild, Bun and Farm don't tell a plugin whether a build watches, so `declare: true` throws there, as it does for the Bun, Node and Turbopack drivers, and `arktype-precompile --declare` runs after their build instead. A Vite app declares once for all its environments, and its build fails where a module is declared outside the root, which the bundle can't hold.

Everything but a Type's declared type is TypeScript's own emit, so `types`, `exports` and subpath imports work as they do with tsc, a const with an annotation is declared as annotated, and a declaration bundler like rollup-plugin-dts rolls the files into one with the shapes still shared. A class or interface is named where a consumer resolves it: through `globalThis` for a global like `Buffer`, the module declaring it, like `import("events").EventEmitter`, or for a module augmentation, the declarations of the module it augments. A shape holding one it can't name that way, like a class its module doesn't export, is left to TypeScript's own declaration. A cyclic scope is declared exactly, where TypeScript 6 writes `any` in the cycle and TypeScript 7 refuses to declare it, unless the cycle holds such a value, which leaves it to TypeScript. Development keeps reading the source, so editors check definitions as they're written and nothing generated goes stale.

Declarations read the compiler API of TypeScript 5.5 to 6 from `typescript`, an optional peer whose range TypeScript 7 also satisfies, so a project that doesn't declare installs nothing more. TypeScript 7 has no compiler API, so a project on it that declares installs TypeScript 6 beside it under an alias:

```sh
npm i -D typescript-6@npm:typescript@6
```

A module that reads the declarations type checks within 2.5x of zod's cost, and below it for the largest app. For one importing each Type of a bench app and assigning its output, with TypeScript 7:

| instantiations (check ms) | login     | moltar    | shop       |
| ------------------------- | --------- | --------- | ---------- |
| source                    | 3384 (16) | 3437 (15) | 31132 (66) |
| tsc's declarations        | 596 (7)   | 724 (7)   | 10797 (24) |
| `--declare`               | 633 (7)   | 761 (7)   | 4403 (18)  |
| zod's source              | 256 (4)   | 668 (5)   | 5958 (19)  |

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
