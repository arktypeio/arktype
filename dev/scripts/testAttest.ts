import { fromHere } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"

shell(`npx tsx src/cli.ts --runner mocha -f './test/**/*.test.ts'`, {
    cwd: fromHere("..", "attest")
})
