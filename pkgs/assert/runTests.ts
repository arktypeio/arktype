import { shell } from "@re-/node"
import { chdir } from "node:process"
import { cacheTypeAssertions, cleanupTypeAssertionCache } from "./src/index.js"

chdir("tests")
cacheTypeAssertions()
shell("pnpm test")
cleanupTypeAssertionCache()
