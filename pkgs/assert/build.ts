// ex. scripts/build_npm.ts
// @ts-ignore (this import will not be available outside of Deno)
import { build, emptyDir } from "dnt"

await emptyDir("./npm")

await build({
    entryPoints: ["./src/index.ts"],
    outDir: "./npm",
    shims: {
        deno: true
    },
    scriptModule: false,
    packageManager: "pnpm",
    importMap: "import_map.json",
    package: {
        name: "@re-/assert",
        version: "0.2.2",
        author: "redo.dev",
        license: "MIT",
        description: "Seamless testing for types and code✅",
        repository: {
            type: "git",
            url: "https://github.com/re-do/re-po.git",
            directory: "pkgs/assert"
        }
    },
    mappings: {
        "../tools/src/index.ts": {
            name: "@re-/tools",
            version: "2.0.0"
        },
        "https://deno.land/x/ts_morph@14.0.0/mod.ts": {
            name: "ts-morph",
            version: "14.0.0"
        },
        "https://unpkg.com/get-current-line@6.6.0/edition-deno/index.ts": {
            name: "get-current-line",
            version: "6.6.0"
        }
    }
})

// post build steps
// @ts-ignore
Deno.copyFileSync("../../LICENSE", "npm/LICENSE")
// @ts-ignore
Deno.copyFileSync("README.md", "npm/README.md")
