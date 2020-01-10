import { isDev } from "@re-do/utils"

module.exports = {
    presets: [["redo", { hot: isDev() }]]
}
