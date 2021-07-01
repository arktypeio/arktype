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
        output: "release",
        buildResources: join(__dirname, "src", "assets")
    },
    files: ["dist/**"],
    extraMetadata: {
        version: buildVersion
    },
    linux: {
        executableName: "redo",
        artifactName: "${productName}-${version}.${ext}",
        target: "AppImage"
    },
    mac: {
        category: "public.app-category.developer-tools"
    },
    beforeBuild: async (ctx) => {
        return false
    },
    afterPack: async (ctx) => {
        shell("pnpm i --prod --store-dir .pnpm", {
            cwd: join(
                ctx.appOutDir,
                ctx.appOutDir.endsWith("mac")
                    ? "@re-doapp.app/Contents/Resources"
                    : "resources",
                "app"
            )
        })
    }
}

module.exports = config
