const { isDev } = require("@re-do/utils/dist/node")

module.exports = {
    presets: [["redo", { hot: isDev() }]],
}
