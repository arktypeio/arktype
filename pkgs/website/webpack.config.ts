import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"
import { isDev } from "@re-do/node-utils"

export default makeConfig({
    base: "web",
    entry: resolve(__dirname, "src", "index.tsx"),
    tsconfig: resolve(__dirname, "tsconfig.json"),
    devServer: isDev() ? {} : undefined
})
