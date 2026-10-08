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

By default, each definition becomes a standalone validator and `arktype` resolves to `arktype/runtime`, so arktype's parser never ships. A definition that holds a function, reads a value from another module or calls a static helper can't be precompiled this way yet, and fails the build with the reasons why.

`precompile.vite({ runtime: "arktype" })` ships arktype and leaves definitions as written, registering the code arktype would compile for each one, and for arktype's keywords before arktype loads. A definition the build can't precompile is compiled at runtime as usual, so this mode never fails a build.
