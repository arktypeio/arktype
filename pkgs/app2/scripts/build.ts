import { build } from "vite"
import { dirname } from "path"

const mode = (process.env.MODE = process.env.MODE || "production")

const packagesConfigs = [
    "src/main/vite.config.js",
    "src/renderer/vite.config.js"
]

const buildByConfig = (configFile: string) => build({ configFile, mode })
;(async () => {
    try {
        const totalTimeLabel = "Total bundling time"
        console.time(totalTimeLabel)

        for (const packageConfigPath of packagesConfigs) {
            const consoleGroupName = `${dirname(packageConfigPath)}/`
            console.group(consoleGroupName)

            const timeLabel = "Bundling time"
            console.time(timeLabel)

            await buildByConfig(packageConfigPath)

            console.timeEnd(timeLabel)
            console.groupEnd()
            console.log("\n") // Just for pretty print
        }
        console.timeEnd(totalTimeLabel)
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
})()
