import merge from "webpack-merge"
import { resolve } from "path"
import { webConfig } from "redo-bundle/webpack.base"

export default merge.smart(webConfig, {
    entry: [resolve(__dirname, "src", "index.tsx")]
})
