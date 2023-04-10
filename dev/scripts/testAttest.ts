import { fromHere } from "../attest/src/runtime/fs.js"
import { shell } from "../attest/src/runtime/shell.js"

shell(`pnpx ts-node cli.ts --cmd mocha`, {
    cwd: fromHere("..", "attest")
})
