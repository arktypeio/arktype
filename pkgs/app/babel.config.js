const { isDev } = require("@re-do/utils")

module.exports = {
    presets: [["redo", { hot: isDev() }]]
}
