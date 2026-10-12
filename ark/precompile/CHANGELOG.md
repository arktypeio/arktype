# @ark/precompile

## Unreleased

### Compare each definition with arktype in tests with `shadow: true`

In shadow mode, a standalone build creates each definition with arktype as well as precompiling it, from the same values evaluated once, and the program runs on arktype. Each validation and each read of what a validator bakes compares the two, returning arktype's result where they agree and throwing an error naming the definition where they don't, as where the validator throws at creation and arktype doesn't. Functions a definition holds run for both, so it's meant for tests.

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

In a standalone build, a definition after a `// @ark-runtime` comment runs on arktype, which then ships beside the runtime. The build fails if a runtime island reads a precompiled validator other than to validate with it, or reaches arktype outside an island. It also fails where code it keeps reads an export the standalone runtime lacks, like `scope` in a static helper whose every call it precompiles. A package that reads arktype's nodes, like `arksets`, `@ark/schema` or `@ark/json-schema`, must be used in an island too, since a standalone build replaces them with validators. So must a locale from `arktype/locales`, since writing errors in one needs the description writers of arktype's nodes: a standalone validator writes its errors only in en, even beside a runtime island, and `toLocaleString(locale)` and `messageIn` throw for any locale but en. `--check` lists islands and leaves them out of the rate `--fail-under` compares. A marker before a statement holding no definition is ignored without a diagnostic.

```ts
// @ark-runtime
export const Shaped = type(await loadShape())
```

### Precompile while bundling

`@ark/precompile/unplugin` replaces each arktype definition with a standalone validator as Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun or Farm bundles it, so only arktype's runtime ships. `runtime: "arktype"` ships arktype instead, with precompiled code in place of `new Function` for each definition and the keywords it reaches, each written once however many definitions reach it. A cache-mode hit runs the build's compiled code even under `jitless`, since it needs no `new Function`. Either mode fails the build if `arktype`, `@ark/schema` or `@ark/util` resolves to more than one copy. A program's `configure()` call, in the module the `config` option names, applies to both: the build precompiles every definition under it, and in standalone mode the call configures `arktype/runtime`. A standalone build refuses each definition under a call it can't apply, such as one whose argument isn't static or holds an object a module exports or writes, or one the program may not run before its first Type, as under an `if` or in a function, so `--check` counts none of them accepted. A call it can't place, as when the build has no `config` option, fails `--fail-under` whatever the rate. The configuration is read from its modules as the build is given them, so the ESLint rule applies a config module being edited. A build given them again with other text, as when a plugin ahead of arktype's transpiles one, keeps its configuration if `configure()` receives the same values, and otherwise reports the call rather than keep either. In standalone mode, `configure()` throws before any validator exists if it receives other values than the build precompiled under, as when a loader or plugin changes a module the configuration reads after the build read it, or if it's called a second time, as a dependency the build doesn't transform can call it. Each validator throws if the only call is one the build didn't transform. The first validator throws if what `configure()` received is written before it's created. A function counts there only as a function: writers and `onFail` run as the program has them, but the build calls a `description` writer, so one a host changes after the build read it isn't caught.

A definition is the largest expression composing an arktype value, which the build follows from arktype's exports through bindings, imports, namespaces, object literals and arrays (nested, imported, behind a `const` key or returned by a function), the parameters of functions only called in their own module, and what functions return, past casts and optional chains. A call to a static helper composes what the helper composes from its arguments, so `withId(A).partial()` with `withId = t => t.and({ id: "string" })` is one definition. A member a standalone validator has, like `.expression` or `.assert`, ends it, so reading one runs at runtime. In a standalone build, reading one it lacks, like `.and`, `.in` or `.json`, outside any definition the build can precompile fails the build rather than throwing or reading `undefined` at runtime, as does reflecting on a Type there, like `JSON.stringify(T)`, `Object.keys(T)` or `{ ...T }`. A Type's `json`, `toJSON()` or `toJsonSchema()` read where the build can precompile the Type is replaced by what arktype returns. Otherwise a validator has them, and `~standard.jsonSchema`, only where the `introspection` option lists them, as `introspection: ["json", "toJsonSchema"]` does, baked under the program's configuration: `toJsonSchema()` writes a new schema at each call and takes no options but a `target`, and the build refuses a schema calling a default's thunk, which arktype calls at each write.

The build fails rather than precompiling where it sees a Type composed but can't fold it: through a class's static field or getter, an object literal's getter or method, an immediately called function, a parameter each call passes a Type, or an array of Types a loop iterates. It doesn't see a Type, which a standalone build then replaces with a validator lacking the members that compose it, in:

- a parameter of an exported function or of a method, unless the function is a static helper, or one some calls pass something else;
- a parameter of a function called through another binding, like `alias(A)` with `const alias = nullable`;
- a callback's parameter, like `t` in `[A, B].map(t => t.or("null"))`;
- an object or array passed to a function or iterated, like `o.User` in `const pick = o => o.User.or("null")` or `Object.freeze({ User })`;
- an instance's field or getter, like `new Forms().user`, or what `this` reads;
- a property assigned or an element added after the literal, like `schemas.User = type(...)` or `list.push(type(...))`;
- what an array method returns, like `[A].at(0)`;
- what `await` returns;
- a key known only at runtime, like `schemas[name].or("null")`.

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

In standalone mode, a definition holding a morph, a predicate, a default's function, a class or a symbol is precompiled to a factory, and the definition becomes a call passing each of those values where it was written, so it is evaluated when the original would have been. The factory checks that each value is what its code was compiled for (a function's parameter count, a class's builtin and other ancestors, a symbol's description), and that a value the definition reads through two expressions, or that a Type it references also holds, is still one value, and that values it reads from other modules through two expressions, which a mock could make one, are still distinct, and throws at creation if not, then creates the validator, printing each function's own name in its expressions, descriptions, discriminants' cases and errors with arktype's own printing, so a union's branches printing alike once their functions are named, as a build minifying its chunks apart may name functions of two chunks, print once. arktype sorts a union's branches and an object's index signatures by the names of the functions they hold, as with `type.instanceOf(Cat).or(type.instanceOf(Dog))`. Where the build writes the same factory with those functions exchanged, its code, strings and introspection alike, the factory sorts the functions it receives by name and binds each where its sibling sorts, so a function a program or a minifier renames is ordered as arktype orders it. A definition whose order depends on a name otherwise is reported: one whose siblings differ beyond those functions or compile apart for them, as a predicate taking a context does beside one that doesn't, one sorting a function against a keyword's, and one holding a parameter's function, whose name the build doesn't know. Functions one expression created, like those of a predicate factory called twice, share the name it prints, so the factory checks they are named alike. A function the definition reads but its Type no longer holds, like a narrow or a default's thunk an intersection reduces to `never`, is received and checked too, as arktype checked its kind and parameters as it parsed it. A factory reads each function's name and parameter count where it creates its validator, while arktype keeps those it read first, so they can differ for a function a program renames or gives another `length` after passing it to arktype.

```ts
const trim = (s: string) => s.trim()
export const Name = type("string").pipe(trim)
// becomes
export const Name = $arkf1j3ffm9dngv(trim)
```

A default is applied as arktype applies it, through its value's validator, so a default its value transforms and the `[]` or `{}` a string default parses to are precompiled too. A function default is called as a thunk where arktype found it one as it created the node, even if its parameter count changes later. arktype checks a default against a narrowed Type once, where it first creates the node holding it, so the build doesn't call the narrow: each factory whose definition reaches that node runs the check once it creates the validators, in the order the definition's calls reached it, and throws the ParseError arktype would have thrown, written in the Scope's configuration. A definition reaches a node by creating it, or by finding in one of arktype's caches what creating it computed, as a Scope's alias another definition resolved first or `keyof` of one, whether or not its result keeps the node, so `type({ a: [["number", ":", isEven], "=", 3] }).omit("a")` throws as arktype does, and so does a site reading its `json`. A check that passed isn't run again in that run for an equal node, value and functions under the same configured error writers, which its narrows read as `ctx.config`, whichever Scope the node is in otherwise, as a narrow whose answer never changes answers it alike. How often arktype runs a narrow to check a default follows its caches, so for a narrow whose answer changes between calls, which definition throws can differ from arktype's.

A matcher is precompiled the same way, receiving its handlers, and one whose default is `"assert"` or `"never"` throws for data no case matches, as arktype's does. So is a `type.fn` TypedFn, receiving its implementation: it is arktype's own wrapper, validating with the validators of its parameters and return, and named for the function it receives.

A definition referencing a Type that holds functions receives that Type's validator and takes them from it. A definition reading a value through a binding (an object or a primitive declared in the module, an import, a `define`) receives it after those values and compares it with what the build read before creating anything: a primitive by `Object.is`, an object by its keys in order and then each value, a Type by its content and by the Scope its methods, like `and` and `or`, parse their arguments in, whose functions it holds too, importing it if the module doesn't. A mismatch throws, naming the value and both readings, so a mocked module, a mutated object or a stubbed define fails at creation rather than validating differently.

A Module, Scope or Generic holding functions or reading a value through a binding is precompiled to a factory too, as `type.module({ a: ["string", "=>", trim] })` or `scope({ a: ["string", ":", isLong] })` is. Its value holds those functions, so a definition creating a Type in that Scope, instantiating that Generic or reading that Module receives it and takes them from it, after checking it is the value the build read: one with the same definitions, nested the same way, and configuration, holding its functions in the same places, and for a Generic, parsing its arguments in the same Scope. A Type created in that Scope holds them too, though its own definition may not, so its factory receives the Scope. Where the validator's code holds nothing the factory receives, as for `$.type({ name: "string" })` beside a narrowed alias or a Type another module composes from it, that code is written once with the module's other validators, and the factory only checks what it receives and keys a copy of that validator with the Scope's functions. Functions arktype calls while it defines the Scope's aliases, like a thunk's, aren't held, so a definition resolving one is reported where another module can replace the Scope or a Type of it, naming the value whose Scope holds the alias, and wherever the Type the thunk returns holds a function or symbol, as `$.type("a")` and `$.type("keyof a")` do with `a: () => type("string").narrow(isLong)`, suggesting the Scope and the definitions reading it be marked `// @ark-runtime`. One that doesn't resolve it, like `$.type("b[]")` beside it, is precompiled. So is one receiving a Scope or Generic whose definitions hold a thunk below an alias, an hkt body, a function in its configuration or a narrow arktype tested on literal values, since what those return decides what it creates, and the report names which. A Type of such a Scope is reported only where the site resolves the alias holding the narrow, as `types.user.and({ c: "code" })` does with `code: ["'a' | 'b'", ":", isAllowed]`, since the Type's own nodes are compared by content.

A definition calling a static helper (a function whose body is one expression) is precompiled with what the helper returned at build. Vitest through the plugin, `node --test` through `register()` and `bun test` through the Bun plugin replace whole modules when they mock one, so under them each module registers the functions it exports, and a definition calling a helper another module exports checks at creation that it received the registered function: a mock is another function, and a module the runner replaced registered nothing. `checkHelpers` sets this outside those runners, or turns it off; `bun test` is recognized by the `NODE_ENV` it sets, so a suite setting its own passes `checkHelpers: true`.

A definition in a function, a loop's body or an instance's field runs each time they do. arktype creates a new Scope, Module or Generic each time, and a new Type when its Scope is new, but whether values created apart are one object is unspecified, so a definition precompiled to a value is created once. A factory returns the validator it created before for the same functions, as creating one at each call is many times slower, sharing it with each factory in its module whose definition arktype returned the same Type for.

A function a parameter holds, like `fn` in `function narrowed(fn) { const T = type("string").narrow(fn); return T }` or a callback's parameter, is received the same way, though the build can't know which function it is. arktype calls a predicate or morph of 1 parameter without its context and one of any other count with it, so the build compiles the definition for a function of no parameters, of 1 and of 2 or more, keeping a variant for each distinct result. Its factory selects one by the parameter count of the function it receives and creates only that variant's validator, from traversals written once for the nodes the variants share. A class a parameter holds is compiled as one with no builtin ancestors, so a call the build sees passing a builtin or a class extending one is reported, and the factory throws at creation for one a call elsewhere passes. A builtin a parameter holds as a function is selected by its length like any other. The factory throws at creation for a Type or anything but a function there, and for a function another value the definition holds is too, since arktype relates the two by identity. A definition needing more factories than `maxVariants`, 8 by default, is reported, naming the parameters, as is one reading a Type such a function created, like `A.array()` after `const A = type("string").narrow(fn)`, which is another Type for each count and holds nothing to select by.

These definitions are reported rather than precompiled:

- one holding a parameter's value other than as a function or class, like an example, a unit or a Scope's configuration, or reading a parameter its function assigns;
- one reading a Scope, Module or Generic whose own definition is reported;
- one throwing a ParseError that reads a binding, or holds or calls a function, itself or through any value it passes to arktype;
- one throwing a ParseError another definition threw, such as a runtime island it reads;
- one whose code sees a function's name in what arktype prints, such as a `where` selector or description writer reading a predicate's `expression`, or a `JSON.stringify` replacer receiving a Type's JSON;
- one sorting by the name of a function no declaration names, like a parameter's;
- one calling another module's function that an import cycle can run before a binding of that module it reads is set, where the build can't check how far the module has run, as for an arrow exported as `export default`, reported as "`f` can run before `B` (file:line:column) is set; export `B` so the site can receive it", which exporting `B` fixes;
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

`register()` from `@ark/precompile/node` precompiles each module Node loads, through `module.registerHooks`, so `node --test` runs tests against precompiled code. In standalone mode it resolves `arktype` to `arktype/runtime`. The precompiler runs in a worker thread, so a program's own arktype never sees the Types it builds. The configuration is read from its files, or as these hooks are given a module they precompile, and in standalone mode `configure()` throws if a loader gives the program other values, while one that transpiles a module, as tsx does, configures the same. A module esbuild transpiled, as tsx runs one, is precompiled as its source would be: a function keepNames wraps in `__name()` is read as written, and a helper exported by an `export { field }` clause as one exported where it's declared. A module these hooks aren't given the text of, as one loaded before `register()` ran or one a loader compiles itself, as tsx does each module of a CommonJS package, isn't precompiled: cache mode runs it on arktype, and in standalone mode its import of `arktype` or `arktype/config` throws, naming the module and why.

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
