const { shell } = require("@re-do/node-utils")
const { writeFileSync } = require("fs")
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
        // Only install non-bundled dependencies
        const packageJsonContents = require("./package.json")
        writeFileSync(
            join(resourceDir, "package.json"),
            JSON.stringify({
                ...packageJsonContents,
                dependencies: {
                    playwright: packageJsonContents.dependencies.playwright,
                    "electron-redux":
                        packageJsonContents.dependencies["electron-redux"]
                },
                devDependencies: {}
            })
        )
        shell("npm install", {
            cwd: resourceDir
        })
    }
}

module.exports = config
