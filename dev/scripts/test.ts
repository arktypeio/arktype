import { cleanup, fromHere, setup } from "../attest/main.js"
import { shell } from "../attest/src/shell.js"

setup()
shell(
    `pnpm vitest run --config ${fromHere("..", "configs", "vitest.config.ts")}`
)
cleanup()
