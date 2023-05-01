import { cleanup, setup } from "../attest/main.js"
import { shell } from "../attest/src/shell.js"

setup()
shell("pnpm mocha")
cleanup()
