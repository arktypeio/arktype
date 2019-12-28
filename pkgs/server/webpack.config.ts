import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"

module.exports = makeConfig({
    base: "common",
    entry: resolve(__dirname, "main.ts"),
    tsconfig: resolve(__dirname, "tsconfig.json")
})
