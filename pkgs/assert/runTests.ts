import {
    cacheTypeAssertions,
    cleanupTypeAssertionCache
} from "@src/type/analysis.ts"

Deno.chdir("tests")
cacheTypeAssertions()
await Deno.run({ cmd: ["deno", "test", "--allow-all"] }).status()
//cleanupTypeAssertionCache()
