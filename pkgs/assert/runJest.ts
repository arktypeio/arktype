import { chdir } from "node:process"
import jest from "jest"
import { cacheTypeAssertions, cleanupTypeAssertionCache } from "./src/index.js"

chdir("tests")
cacheTypeAssertions()
await jest.run()
cleanupTypeAssertionCache()
