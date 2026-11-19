// compiles index.ts as zod-compiler's generate.ts compiles its schema: the same tsdown config, with
// arktype's precompiler as the plugin. The arm mirrors a production build's defaults, which a tsdown
// build can't tell the plugin it is: @ark/aot's productionDefaults, and prune, which a production build
// has unless it's set false and the download arm's ARK_OPTIONS pass too (reproduce.ts). Without it the
// module isn't the default build: its runtime is arktype's as written, not as the build would write it
// for what the module reads. arktype is bundled in, as the precompiler resolves its imports to
// arktype/runtime only where the bundle holds them.
// ARK_AOT=<arktype checkout's ark/aot> node ./libraries/arktype/precompiled/generate.ts
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import type { UserConfig } from "vite-plus/pack";
import { build } from "vite-plus/pack";

import baseTsdownConfig from "../../../tsdown.config.ts";

const { precompile } = await import(
  pathToFileURL(path.join(process.env.ARK_AOT!, "out", "unplugin.js")).href
);

const config: UserConfig = {
  ...baseTsdownConfig,
  entry: [path.resolve(import.meta.dirname, "./index.ts")],
  outDir: path.resolve(import.meta.dirname, "./compiled"),
  dts: false,
  // bundled, as an app's bundler would, so the precompiler resolves arktype's imports to its runtime
  deps: { ...baseTsdownConfig.deps, alwaysBundle: [/^arktype/, /^@ark\//, /^arkregex/, /^arksets/] },
  plugins: [
    precompile.rolldown({ freeze: false, creationChecks: "none", config: false, prune: true }),
  ],
};

await build(config);
