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
        target: "zip",
        artifactName: "${name}-${version}-${os}.${ext}"
    },
    mac: {
        target: "zip",
        artifactName: "${name}-${version}-${os}.${ext}"
    },
    win: {
        target: "zip",
        artifactName: "${name}-${version}-${os}.${ext}"
    },
    beforeBuild: async (ctx) => {
        return false
    }
    // afterAllArtifactBuild: async (ctx) => {
    //     const os = getOs()
    //     const zip = new Zip()
    //     const releaseDir = join(ctx.outDir, releaseDirNames[os])
    //     const releaseZip = join(ctx.outDir, getRedoZipFileName(os, version))
    //     zip.addLocalFolder(releaseDir)
    //     zip.writeZip(releaseZip)
    //     return [releaseZip]
    // }
}

module.exports = config
