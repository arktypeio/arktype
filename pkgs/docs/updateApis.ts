import { fromHere, reDoc } from "@re-/node"

reDoc({
    packages: [{ rootDir: fromHere("..", "model") }],
    baseOutputDir: fromHere("docs", "api")
})
