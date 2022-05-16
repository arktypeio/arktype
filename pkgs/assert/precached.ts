import {
    cacheTypeAssertions,
    cleanupTypeAssertionCache
} from "./src/type/analysis.ts"

cacheTypeAssertions()
await Deno.run({ cmd: ["deno", "test", "--allow-all"] }).status()
cleanupTypeAssertionCache()
