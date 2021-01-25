import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"
import { isDev } from "@re-do/utils/dist/node"
const config = makeConfig({
    base: "web",
    entry: resolve(__dirname, "src", "index.tsx"),
    tsconfig: resolve(__dirname, "tsconfig.json"),
    devServer: isDev() ? {} : undefined
})

console.log(JSON.stringify(config,null,4))

export default makeConfig({
    base: "web",
    entry: resolve(__dirname, "src", "index.tsx"),
    tsconfig: resolve(__dirname, "tsconfig.json"),
    devServer: isDev() ? {} : undefined
})
