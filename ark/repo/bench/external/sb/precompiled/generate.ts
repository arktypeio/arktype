// compiles index.ts as zod-compiler's generate.ts compiles its schema: the same tsdown config, with
// arktype's precompiler as the plugin. Its options are the default build's in a production bundle
// (@ark/aot's productionDefaults), which a tsdown build can't tell it is. arktype is bundled in, as the
// precompiler resolves its imports to arktype/runtime only where the bundle holds them.
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
  plugins: [precompile.rolldown({ freeze: false, creationChecks: "none", config: false })],
};

await build(config);
