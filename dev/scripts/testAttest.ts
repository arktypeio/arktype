import { fromHere } from "../runtime/fs.js"
import { shell } from "../runtime/shell.js"

shell(`pnpx ts-node cli.ts --cmd mocha`, {
    cwd: fromHere("..", "attest")
})
