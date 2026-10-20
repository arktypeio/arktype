# @ark/precompile

Constructs a program's arktype definitions at build time, so arktype's parser never ships and nothing compiles at runtime.

Each definition becomes a standalone validator running on `arktype/runtime`, which validates, asserts and implements Standard Schema as the Type it replaces does. A definition the build can't precompile fails the build, naming the file, the definition and the fix. `runtime: "arktype"` ships arktype instead, registering the code it would compile for each Type.

```sh
npm i -D @ark/precompile
```

Add its plugin to your bundler. It works with Vite, Rollup, Rolldown, webpack, Rspack, esbuild, Bun and Farm, and Vitest runs tests through it too:

```ts
// vite.config.ts
import { precompile } from "@ark/precompile/unplugin"

export default {
	plugins: [precompile.vite()]
}
```

List what the build can't precompile before you switch:

```sh
npx arktype-precompile --check "src/**/*.ts"
```

See [arktype.io/docs/precompile](https://arktype.io/docs/precompile) for everything else, including what a build checks, its options, and the Node, Bun and Turbopack drivers.
