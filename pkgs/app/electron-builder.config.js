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
        artifactName: "${name}-${version}-windows.${ext}"
    },
    beforeBuild: async (ctx) => {
        return false
    }
}

module.exports = config
