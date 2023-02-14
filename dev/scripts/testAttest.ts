import { fromHere } from "../runtime/fs.ts"
import { shell } from "../runtime/shell.ts"

shell(`pnpx ts-node cli.ts --cmd mocha`, {
    cwd: fromHere("..", "attest")
})
