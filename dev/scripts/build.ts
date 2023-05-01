import { rmSync } from "node:fs"
import { join } from "node:path"
import { readJson, shell, writeJson } from "../attest/src/main.js"
import { repoDirs } from "./common.js"

console.log(`🔨 Building arktype...`)
rmSync(repoDirs.outRoot, { recursive: true, force: true })
const tsConfigData = readJson(join(repoDirs.configs, "tsconfig.json"))
const tempTsConfig = join(repoDirs.root, "tsconfig.temp.json")
writeJson(tempTsConfig, {
    ...tsConfigData,
    include: ["src"],
    compilerOptions: {
        ...tsConfigData.compilerOptions,
        noEmit: false,
        module: "commonjs",
        outDir: "dist",
        rootDir: "src"
    }
})
try {
    shell(`pnpm tsc --project ${tempTsConfig}`)
} finally {
    rmSync(tempTsConfig, { force: true })
}
console.log(`📦 Successfully built arktype!`)
