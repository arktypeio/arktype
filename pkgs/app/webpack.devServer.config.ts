import { makeConfig } from "@re-do/bundle"
import {
    externalPlaywrightConfig,
    tsconfig,
    rendererEntry
} from "./webpack.config"

export default makeConfig(
    {
        base: "renderer",
        entry: rendererEntry,
        tsconfig,
        devServer: {}
    },
    [externalPlaywrightConfig]
)
