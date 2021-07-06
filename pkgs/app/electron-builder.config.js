const { shell } = require("@re-do/node-utils")
const { join } = require("path")

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
    directories: {
        output: "release",
        buildResources: join(__dirname, "src", "assets")
    },
    files: ["dist/**"],
    appId: "redo",
    extraMetadata: {
        name: "redo"
    },
    artifactName: "redo-${version}-${os}.${ext}",
    linux: {
        target: "zip"
    },
    mac: {
        target: "zip"
    },
    win: {
        target: "zip"
    },
    beforeBuild: async (ctx) => {
        return false
    },
    afterPack: async (ctx) => {
        const resourceDir = join(
            ctx.appOutDir,
            ctx.appOutDir.endsWith("mac")
                ? "redo.app/Contents/Resources"
                : "resources",
            "app"
        )
        shell("pnpm i --prod --shamefully-hoist", {
            cwd: resourceDir
        })
    }
}

module.exports = config
