import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"

export default makeConfig(
    {
        base: "node",
        entry: resolve(__dirname, "src", "lambda.ts"),
        tsconfig: resolve(__dirname, "tsconfig.json")
    },
    [
        {
            output: {
                path: resolve(__dirname, "dist", "__lambda__"),
                filename: "index.js"
            }
        }
    ]
)
