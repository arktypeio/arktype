import { build } from "vite"

const packagesConfigs = [
    "src/main/vite.config.ts",
    "src/renderer/vite.config.ts"
]
const buildAll = async () => {
    for (const configFile of packagesConfigs) {
        await build({ configFile })
    }
}

buildAll()
