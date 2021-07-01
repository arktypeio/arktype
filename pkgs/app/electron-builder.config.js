const { shell } = require("@re-do/node-utils")
const { join } = require("path")

const now = new Date()
const buildVersion = `${now.getFullYear() - 2000}.${
    now.getMonth() + 1
}.${now.getDate()}`

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
    directories: {
        output: "release"
    },
    files: ["dist/**"],
    extraMetadata: {
        version: buildVersion
    },
    beforeBuild: async (ctx) => {
        return false
    },
    afterPack: async (ctx) => {
        shell("pnpm i --prod", { cwd: join(ctx.appOutDir, "resources", "app") })
    }
}

module.exports = config
