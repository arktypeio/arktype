import { fromHere } from "../attest/src/runtime/fs"
import { shell } from "../attest/src/runtime/shell"

shell(`pnpx ts-node cli.ts --cmd mocha`, {
    cwd: fromHere("..", "attest")
})
