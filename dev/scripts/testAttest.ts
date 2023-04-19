import { fromHere } from "../attest/src/runtime/fs.js"
import { shell } from "../attest/src/runtime/shell.js"

shell(`pnpx ts-node src/cli.ts --runner mocha -f './test/*.test.ts'`, {
    cwd: fromHere("..", "attest")
})
