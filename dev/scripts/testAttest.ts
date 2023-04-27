import { fromHere } from "../runtime/fs.js"
import { shell } from "../runtime/shell.js"

shell(`node cli.ts --cmd mocha`, {
    cwd: fromHere("..", "attest"),
    env: {
        NODE_OPTIONS: "--loader=ts-node/esm"
    }
})
