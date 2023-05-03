import { fileName } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"
import { cleanup, setup } from "../attest/src/type/cacheAssertions.js"

const vitestArgs = process.argv.slice(process.argv.indexOf(fileName()) + 1)

setup()
shell(
    `pnpm vitest run --config ./dev/configs/vitest.config.ts ${vitestArgs.join(
        " "
    )}`
)
cleanup()
