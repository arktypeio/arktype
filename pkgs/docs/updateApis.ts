import { fromHere, generateDocs } from "@re-/node"

generateDocs({
    packageRoots: [fromHere("..", "model")],
    outputRoot: fromHere("docs", "api")
})
