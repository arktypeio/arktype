import { cacheAssertions, cleanupAssertions } from "../attest/main.js"
import { shell } from "../attest/src/shell.js"

cacheAssertions()
shell("pnpm mocha")
cleanupAssertions()
