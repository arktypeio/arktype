import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"

export default makeConfig({
    base: "renderer",
    entry: resolve(__dirname, "src", "renderer", "index.tsx"),
    tsconfig: resolve(__dirname, "tsconfig.json"),
    devServer: {}
})
