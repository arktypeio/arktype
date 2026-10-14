# @ark/precompile

## Unreleased

### A standalone validator's `length` is 1

A standalone validator declares only its data, so its `length` is 1 where a Type's is 2, and a call passing only data, as most do, pads no parameters. A copy a factory keys with a Scope's functions still declares a traversal and an `onFail`, so its `length` stays 2. Every validator reads a traversal and an `onFail` passed after its data as before, and a Type piping to it still passes it the Type's traversal, which takes its errors rather than letting a throwing `onFail` throw them.

### Emit declarations whose Types share one file of shapes

`arktype-precompile --declare` writes what `tsc --emitDeclarationOnly` would for the tsconfig's program, except that each Type, Scope and Module is declared through its shape in one `~arktype.d.ts`, named once and referenced wherever another shape holds it. A package whose types others read can ship them, so its consumers don't infer its definitions: a module importing each of a 23-Type app's Types checks with 4403 instantiations rather than 31132 from source or 10797 from tsc's declarations. The bundler plugin emits them with a Rollup, Rolldown, Vite, webpack, Rspack or Rsbuild build that neither watches nor serves, and throws with esbuild, Bun and Farm, which don't say whether a build watches, as the Bun, Node and Turbopack drivers do:

```ts
precompile.vite({ declare: true })
```

It needs the compiler API of TypeScript 5.5 to 6 from the optional `typescript` peer, which a TypeScript 7 project installs as `typescript-6`.

### Create standalone validators as their modules load with `lazy: false`

A standalone validator is created where a site first reads it. `lazy: false` creates each as the module defining it loads, so an error creating one throws on import.

```ts
precompile.vite({ lazy: false })
```

### Say the program never configures arktype with `config: false`

`config: false` says the program never calls `configure()`, so the build fails wherever it does, and a standalone validator neither fixes the configuration as it's created nor reads the configured `onFail`.

```ts
precompile.vite({ config: false })
```

### Leave standalone validators unfrozen with `freeze: false`

A standalone validator and its members, like `assert`, `allows` and `~standard`, are frozen, so a program writing to one throws in strict mode code. `freeze: false` leaves them unfrozen, for a program that doesn't rely on that.

```ts
precompile.vite({ freeze: false })
```

### Leave out what a standalone validator has with `members`

`members` sets which members a standalone validator has: those it bakes of its Type's introspection where true, and `assert`, `meta`, `~standard` and the methods it inherits, `traverse()`, `from()` and `toString()`, unless false. The build fails where a program reads one it drops, and a validator the runtime reads keeps every member, as a default's value or a `type.fn`'s parameters. A validator without its methods declares a traversal and an `onFail` after its data, so its `length` stays 2, as a Type piping to a function of `length` 1 passes it its traversal only where the function inherits `traverse()`.

```ts
precompile.vite({ members: { assert: false, meta: false } })
```

### Return errors of a standalone validator's own, and only the first with `errors: "first"`

A standalone validator returns errors of its own rather than arktype's. Each issue holds the failed check's `code`, `path`, `data` and `expected`, and its `message`, like `name must be a string`, is written when the issues are first read, so invalid data creates only those objects and the runtime ships no error writers. A message doesn't say what the value was, the errors arktype groups at one path stay apart, a union no branch allows is one issue naming the union's description, and the build refuses error text configured for a code a Type can raise. The errors are instances of `type.errors` and of `ArkErrors` from `arktype`, but not of `@ark/schema`'s `ArkErrors`, arktype's own subclass, so the build fails where a module imports that one. `errors: "first"` stops each validation at its first issue:

```ts
precompile.vite({ errors: "first" })
```

### Compare each definition with arktype in tests with `shadow: true`

In shadow mode, a standalone build creates each definition with arktype as well as precompiling it, from the same values evaluated once, and the program runs on arktype. Each validation and each read of what a validator bakes compares the two, returning arktype's result where they agree and throwing an error naming the definition where they don't, as where the validator throws at creation and arktype doesn't. A function a definition holds runs once per validation, the validator's calls answered from arktype's, except a call that adds a `ctx` error or writes its arguments other than by setting or deleting plain keys, which runs again and must answer alike, and what the README lists as running for each side. It's meant for tests.

```ts
precompile.vite({ shadow: true })
```

### Precompile packages that opt in

A package whose `package.json` has `"arktype": { "precompile": true }` is precompiled with the program that depends on it: the build follows its modules and folds its definitions like the program's, through the bundler plugin, Vite's dev server and Vitest, and the Node and Bun drivers. A dependency that doesn't opt in is left as before.

```json
{
	"name": "my-schemas",
	"arktype": { "precompile": true }
}
```

### Leave a definition to arktype with `// @ark-runtime`

In a standalone build, a definition after a `// @ark-runtime` comment runs on arktype, which then ships beside the runtime. The build fails if a runtime island reads a precompiled validator other than to validate with it, or reaches arktype outside an island. It also fails where code it keeps reads an export the standalone runtime lacks. A package that reads arktype's nodes, like `arksets`, `@ark/schema` or `@ark/json-schema`, must be used in an island too, since a standalone build replaces them with validators. So must a locale from `arktype/locales`, since writing errors in one needs the description writers of arktype's nodes: a standalone validator writes its own errors in en, even beside a runtime island. `--check` lists islands and leaves them out of the rate `--fail-under` compares. A marker before a statement holding no definition is ignored without a diagnostic.

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

### Precompile while bundling

`@ark/precompile/unplugin` replaces each arktype definition with a standalone validator as Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm bundles it, so only arktype's runtime ships. `runtime: "arktype"` ships arktype instead, with precompiled code in place of `new Function` for each definition and the keywords it reaches, each written once however many definitions reach it. A cache-mode hit runs the build's compiled code even under `jitless`, since it needs no `new Function`. Either mode fails the build if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy. A program's `configure()` call, in the module the `config` option names, applies to both: the build precompiles every definition under it, and in standalone mode the call configures `arktype/runtime`. A standalone build refuses each definition under a call it can't apply, such as one whose argument isn't static or holds an object a module exports or writes, or one the program may not run before its first Type, as under an `if` or in a function, so `--check` counts none of them accepted. A call it can't place, as when the build has no `config` option, fails `--fail-under` whatever the rate. The configuration is read from its modules as the build is given them, so the ESLint rule applies a config module being edited. A build given them again with other text, as when a plugin ahead of arktype's transpiles one, keeps its configuration if `configure()` receives the same values, and otherwise reports the call rather than keep either. In standalone mode, `configure()` throws before any validator exists if it receives other values than the build precompiled under, as when a loader or plugin changes a module the configuration reads after the build read it, or if it's called a second time, as a dependency the build doesn't transform can call it. Each validator throws if the only call is one the build didn't transform. The first validator throws if what `configure()` received is written before it's created. A function counts there only as a function: writers and `onFail` run as the program has them, but the build calls a `description` writer, so one a host changes after the build read it isn't caught.

A definition is the largest expression composing an arktype value, which the build follows from arktype's exports through bindings, imports, namespaces, object literals and arrays (nested, imported or behind a `const` key), and the parameters of functions only called in their own module, past casts and optional chains. A Type a function returns starts no definition, so `withId(A).partial()` with `withId = t => t.and({ id: "string" })` runs at runtime, and the build fails at `t.and`, which the validator `withId` receives lacks. A member a standalone validator has, like `.meta` or `.assert`, ends it, so reading one runs at runtime. In a standalone build, reading one it lacks, like `.and`, `.in` or `.json`, outside any definition the build can precompile fails the build rather than throwing or reading `undefined` at runtime, as does reflecting on a Type there, like `JSON.stringify(T)`, `Object.keys(T)` or `{ ...T }`, or converting it to a string, like `String(T)` or `` `${T}` ``, which prints its expression. A Type's `expression`, `description`, `json`, `toJSON()` or `toJsonSchema()` read where the build can precompile the Type is replaced by what arktype returns. Otherwise a validator has them, and `~standard.jsonSchema`, only where the `members` option sets them true, as `members: { expression: true, toJsonSchema: true }` does, baked under the program's configuration: `toJsonSchema()` writes a new schema at each call and takes no options but a `target`, and a schema the build can't bake throws where it's read: one calling a default's thunk, which arktype calls at each write, or one whose configured writer reads what the program can change or can't be evaluated. Reading one it lacks throws an error naming the member and the option, as converting the validator to a string does where `expression` isn't set and `JSON.stringify` where `toJSON` isn't.

The build fails rather than precompiling where it sees a Type composed but can't fold it: through a class's static field or getter, an object literal's getter or method, an immediately called function, a parameter each call passes a Type, or an array of Types a loop iterates. A standalone build also fails where a module reads a member a validator lacks off a value the build lost track of after a Type reached it, since the value may be a Type: a parameter typed with arktype's `Type` or `type.Any`, or constrained to one, whose calls the build can't see, a callback's parameter where the call may pass it a Type, like `t` in `[A, B].map(t => t.or("null"))` or in a promise's `.then`, an instance's field, getter or method, including one a superclass declares or `this.list.push` fills, what `this` reads in a class or an object literal's method, a property assigned or an element added after the literal, including by `Object.assign`, an element at a key known only at runtime, what `await` returns, or what a builtin like `Object.freeze` or `new Map` returns. An instance's fields are read one at a time, so `this.http` beside a Type field is left to run, as is a member holding no Type of an object passed to a function the build sees called. An annotation naming another type, like `s: JsonSchema`, says the value isn't a Type unless the build sees one reach it, a cast like `o as Endpoint` says so either way, and `as const` is no cast. `.map`, `.filter` and `.get`, which arrays and Maps share with a Type, are left to run. The error suggests that annotation, or `runtime: "arktype"` where the value is a Type. A Type the build never sees reach a value is missed: calling a member it lacks there throws, and reading one without calling it, like `def.in` in `export function parse(def: EnvSchema) {}` when another module passes it a Type, reads `undefined`, and writing to it, which the runtime freezes, throws in strict mode code and is ignored outside it. The build doesn't see a Type reach a value through `arguments`, a generator, `Reflect.get`, `import()`, a namespace import read at a runtime key or through `Object.values`, a spread of an array it was added to, or a property set on a nested object, on a function or in a class's static block, nor a direct `eval` or a `with` block changing a binding a definition reads, which it folds as declared.

```ts
// vite.config.ts
import { precompile } from "@ark/precompile/unplugin"

export default defineConfig({ plugins: [precompile.vite()] })
```

In watch mode and in a dev server, a module is rebuilt when any module its definitions were read from changes: each module the build followed from it, including one imported with a comment before its specifier, the config module with what it imports, and the `tsconfig.json` whose `paths` resolve their imports. These changes don't rebuild it until something else does:

- creating a file one of its imports names, or one an import would now resolve to;
- editing a `package.json`, since the packages that opt in are read at startup;
- editing a tsconfig the nearest `tsconfig.json` extends or references;
- for a module left as it is because nothing it imports can reach arktype, a change past its direct imports that makes one of them export a Type.

### Emit each Type's code once

Each Type's compiled code is a module named by its content, which every module composing the Type imports, so a bundle holds one copy however many modules reach it, and a factory receiving a Type from another module creates only its own validator. The Node and Bun drivers serve these modules through their hooks in standalone mode; Turbopack, which has no virtual modules, places them in each module that reaches them, as before.

Each Type is created where a site first reads it, so a bundler drops one nothing reads. A site receives a Type or static helper another module declares, so a bundler honoring `"sideEffects": false` keeps that module with whatever else it runs, unless the module only declares: its imports are arktype's or `import type`, and its top level declares only functions, types and variables holding literals, functions or Types whose creation checks nothing. Only an `import type` or `export type` is taken not to run its module, since an import whose specifiers are all marked `type` still runs it in Node and under `verbatimModuleSyntax`, so a config module importing a Type's module that way reports the Type as created before `configure()` runs. A site an import cycle can run before a binding it reads is set throws at creation, as arktype does. Whether two Types, metas or json objects created apart are one object is unspecified, as in arktype, so a module creates its own where arktype might return one it created elsewhere, and two Types whose json is the same share it.

### Precompile definitions holding functions

In standalone mode, a definition holding a morph, a predicate, a default's function, a class or a symbol is precompiled to a factory, and the definition becomes a call passing each of those values where it was written, so it is evaluated when the original would have been. The factory checks that each class, and each function or symbol another module supplies, which a mock can replace, is what its code was compiled for (a function's parameter count, a class's builtin and other ancestors, a symbol's description), and that a value the definition reads through two expressions, or that a Type it references also holds, is still one value, and throws at creation if not, then creates the validator, printing each function's own name in its expressions, descriptions and errors, though a union whose branches print alike once their functions are named, as a build minifying its chunks apart may name functions of two chunks, prints each branch where arktype prints one. arktype sorts a union's branches and an object's index signatures by the names of the functions they hold, as with `type.instanceOf(Cat).or(type.instanceOf(Dog))`, so a definition whose order depends on such a name is reported, since a program or a minifier can rename the function. Functions one expression created, like those of a predicate factory called twice, share the name it prints, so the factory checks they are named alike. A function the definition reads but its Type no longer holds, like a narrow or a default's thunk an intersection reduces to `never`, is received and checked too, as arktype checked its kind and parameters as it parsed it. A factory reads each function's name and parameter count where it creates its validator, while arktype keeps those it read first, so they can differ for a function a program renames or gives another `length` after passing it to arktype.

```ts
const trim = (s: string) => s.trim()
export const Name = type("string").pipe(trim)
// becomes
export const Name = $arkf1j3ffm9dngv(trim)
```

A default is applied as arktype applies it, through its value's validator, so a default its value transforms and the `[]` or `{}` a string default parses to are precompiled too. A function default is called as a thunk where arktype found it one as it created the node, even if its parameter count changes later. arktype checks a default against a narrowed Type once, where it first creates the node holding it, so the build doesn't call the narrow: each factory whose definition reaches that node runs the check once it creates the validators, in the order the definition's calls reached it, and throws the ParseError arktype would have thrown, written in the Scope's configuration. A definition reaches a node by creating it, or by finding in one of arktype's caches what creating it computed, as a Scope's alias another definition resolved first or `keyof` of one, whether or not its result keeps the node, so `type({ a: [["number", ":", isEven], "=", 3] }).omit("a")` throws as arktype does, and so does a site reading its `json`. A check that passed isn't run again in that run for an equal node, value and functions under the same configured error writers, which its narrows read as `ctx.config`, whichever Scope the node is in otherwise, as a narrow whose answer never changes answers it alike. How often arktype runs a narrow to check a default follows its caches, so for a narrow whose answer changes between calls, which definition throws can differ from arktype's.

A matcher is precompiled the same way, receiving its handlers, and one whose default is `"assert"` or `"never"` throws for data no case matches, as arktype's does. So is a `type.fn` TypedFn, receiving its implementation: it is arktype's own wrapper, validating with the validators of its parameters and return, and named for the function it receives.

A definition referencing a Type that holds functions receives that Type's validator and takes them from it. A definition reading a value through a binding (an object or a primitive declared in the module, or an import) receives it after those values and compares it with what the build read before creating anything: a primitive by `Object.is`, an object by its keys in order and then each value, a Type by its content and by the Scope its methods, like `and` and `or`, parse their arguments in, whose functions it holds too, importing it if the module doesn't. A mismatch throws, naming the value and what each reading found, a primitive as written and anything else by its kind, so a mocked module, a mutated object or a stubbed define fails at creation rather than validating differently.

A Module, Scope or Generic holding functions or reading a value through a binding is precompiled to a factory too, as `type.module({ a: ["string", "=>", trim] })` or `scope({ a: ["string", ":", isLong] })` is. Its value holds those functions, so a definition creating a Type in that Scope, instantiating that Generic or reading that Module receives it and takes them from it, after checking it is the value the build read: one with the same definitions, nested the same way, and configuration, holding its functions in the same places, and for a Generic, parsing its arguments in the same Scope. A Type created in that Scope holds them too, though its own definition may not, so its factory receives the Scope. Where the validator's code holds nothing the factory receives, as for `$.type({ name: "string" })` beside a narrowed alias or a Type another module composes from it, that code is written once with the module's other validators, and the factory only checks what it receives and keys a copy of that validator with the Scope's functions. Functions arktype calls while it defines the Scope's aliases, like a thunk's, aren't held, so a definition resolving one is reported where another module can replace the Scope or a Type of it, naming the value whose Scope holds the alias, and wherever the Type the thunk returns holds a function or symbol, as `$.type("a")` and `$.type("keyof a")` do with `a: () => type("string").narrow(isLong)`. One that doesn't resolve it, like `$.type("b[]")` beside it, is precompiled. So is one receiving a Scope or Generic whose definitions hold a thunk below an alias, an hkt body, a function in its configuration or a narrow arktype tested on literal values, since what those return decides what it creates, and the report names which. A Type of such a Scope is reported only where the site resolves the alias holding the narrow, as `types.user.and({ c: "code" })` does with `code: ["'a' | 'b'", ":", isAllowed]`, since the Type's own nodes are compared by content.

A definition calling a static helper (a function whose body is one expression) is precompiled with what the helper returned at build. Vitest through the plugin, `node --test` through `register()` and `bun test` through the Bun plugin replace whole modules when they mock one, so under them each module registers the functions it exports, and a definition calling a helper another module exports checks at creation that it received the registered function: a mock is another function, and a module the runner replaced registered nothing. `checkHelpers` sets this outside those runners, or turns it off; `bun test` is recognized by the `NODE_ENV` it sets, so a suite setting its own passes `checkHelpers: true`.

A definition in a function, a loop's body or an instance's field runs each time they do. arktype creates a new Scope, Module or Generic each time, and a new Type when its Scope is new, but whether values created apart are one object is unspecified, so a definition precompiled to a value is created once. A factory returns the validator it created before for the same functions, as creating one at each call is many times slower, sharing it with each factory in its module whose definition arktype returned the same Type for.

These definitions are reported rather than precompiled:

- one holding a parameter's value, like `fn` in `function narrowed(fn) { const T = type("string").narrow(fn); return T }`, whether as a function, a class, an example, a unit or a Scope's configuration;
- one reading a Scope, Module or Generic whose own definition is reported;
- one throwing a ParseError that reads a binding, or holds or calls a function, itself or through any value it passes to arktype;
- one throwing a ParseError another definition threw, such as a runtime island it reads;
- one whose code sees a function's name in what arktype prints, such as a `where` selector or description writer reading a predicate's `expression`, or a `JSON.stringify` replacer receiving a Type's JSON;
- one calling another module's function that an import cycle can run before a binding of that module it reads is set, where the build can't check how far the module has run, as for an arrow exported as `export default`, reported as "`f` can run before `B` (file:line:column) is set; export `B` so the site can receive it", which exporting `B` fixes;
- one in a module on an import cycle that receives a value, like one a helper it calls reads, from a module it doesn't import or imports only for types, as importing it there could run that module earlier than the program does;
- one in which arktype tests a value against a class with `instanceof`, as `null` in `type.instanceOf(Cat).or("null")`, since the class a factory receives may test instances by a `Symbol.hasInstance` of its own.

### Precompile in Turbopack

`@ark/precompile/turbopack` is a webpack loader for `turbopack.rules`, reporting each module's forward closure as its dependencies, with the bundler plugin's exceptions. In standalone mode, alias `arktype` to `arktype/runtime` with `turbopack.resolveAlias`.

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

`register()` from `@ark/precompile/node` precompiles each module Node loads, through `module.registerHooks`, so `node --test` runs tests against precompiled code. In standalone mode it resolves `arktype` to `arktype/runtime`. The precompiler runs in a worker thread, so a program's own arktype never sees the Types it builds. The configuration is read from its files, or as these hooks are given a module they precompile, and in standalone mode `configure()` throws if a loader gives the program other values, while one that transpiles a module, as tsx does, configures the same. A module esbuild transpiled, as tsx runs one, is precompiled as its source would be: a function keepNames wraps in `__name()` is read as written. A module these hooks aren't given the text of, as one loaded before `register()` ran or one a loader compiles itself, as tsx does each module of a CommonJS package, isn't precompiled: cache mode runs it on arktype, and in standalone mode its import of `arktype` or `arktype/config` throws, naming the module and why.

```ts
// register.ts, run with `node --import ./register.ts --test`
import { register } from "@ark/precompile/node"

register({ runtime: "arktype" })
```

### Place precompiled code in each module

`inline: true` places what a module would import from virtual modules, its validators or its cache-mode units, at the top of the module itself, for hosts that have no virtual modules.

```ts
precompileModule(source, id, host, { inline: true })
```

### Check which definitions can be precompiled

`arktype-precompile --check` reports each arktype definition in a project as accepted or rejected for precompilation, with the chain of reasons for each rejection. `--fail-under` exits with an error below an acceptance rate, or on any error outside a definition that would fail the build, and `--runtime arktype` reports without rejecting. The same diagnostics are available in the editor through the ESLint rule `@ark/precompile/precompilable`, exported as `configs.recommended` from `@ark/precompile/eslint`.

```sh
npx arktype-precompile --check "src/**/*.ts" --fail-under 90
```
