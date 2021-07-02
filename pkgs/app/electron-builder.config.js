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
    extraMetadata: {
        version: require("./package.json").version
    },
    linux: {
        executableName: "redo",
        artifactName: "redo-${version}.${ext}",
        target: "AppImage"
    },
    mac: {
        target: "tar.gz",
        category: "public.app-category.developer-tools"
    },
    win: {
        target: "nsis"
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
