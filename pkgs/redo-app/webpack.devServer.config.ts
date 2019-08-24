import { resolve } from "path"
import { makeConfig } from "redo-bundle"

export default makeConfig({
    base: "renderer",
    entry: resolve(__dirname, "src", "renderer", "index.tsx"),
    tsconfig: resolve(__dirname, "tsconfig.json"),
    devServer: true
})
