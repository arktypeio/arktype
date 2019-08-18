import { resolve } from "path"
import { makeConfig } from "redo-bundle"

export default makeConfig({
    base: "web",
    entry: [resolve(__dirname, "src", "index.tsx")],
    devServer: process.env.NODE_ENV === "development"
})
