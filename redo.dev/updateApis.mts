import { reDoc } from "@re-/doc"
import { fromHere } from "@re-/node"

reDoc({
    packages: [
        {
            rootDir: fromHere("..", "model"),
            outputDir: fromHere("docs", "model", "api")
        }
    ],
    baseOutputDir: fromHere("docs", "api"),
    excludeIndexMd: true
})
