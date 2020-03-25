import { join } from "path"
import { makeConfig } from "@re-do/bundle"
import nodeExternals from "webpack-node-externals"

module.exports = makeConfig(
    {
        base: "common",
        entry: join(__dirname, "main.ts"),
        tsconfig: join(__dirname, "tsconfig.json"),
    },
    [{ externals: [nodeExternals()] }]
)
