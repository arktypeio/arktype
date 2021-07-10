const { join } = require("path")
const { getRedoZipFileName, getOs } = require("@re-do/node-utils")
const Zip = require("adm-zip")
const { version } = require("./package.json")

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
    directories: {
        output: "release",
        buildResources: join(__dirname, "src", "assets")
    },
    files: [
        "dist/**/*",
        {
            from: "release/dependencies/external",
            to: "node_modules"
        }
    ],
    appId: "redo",
    extraMetadata: {
        name: "redo"
    },
    linux: {
        target: "dir"
    },
    mac: {
        target: "dir"
    },
    win: {
        target: "dir"
    },
    beforeBuild: async (ctx) => {
        return false
    },
    afterAllArtifactBuild: async (ctx) => {
        const os = getOs()
        const zip = new Zip()
        const releaseDir = join(
            ctx.outDir,
            `${os === "windows" ? "win" : os}-unpacked`
        )
        const releaseZip = join(ctx.outDir, getRedoZipFileName(os, version))
        zip.addLocalFolder(releaseDir)
        zip.writeZip(releaseZip)
        return [releaseZip]
    }
}

module.exports = config
