import { cpSync, rmSync } from "node:fs"
import { join } from "node:path"
import { readJson, shell, writeJson } from "../attest/src/main.js"
import { repoDirs } from "./common.js"

const packageRoot = process.cwd()
const outRoot = join(packageRoot, "dist")
const packageJson = readJson(join(packageRoot, "package.json"))

console.log(`🔨 Building ${packageJson.name}...`)
rmSync(outRoot, { recursive: true, force: true })
const tsConfigData = readJson(join(repoDirs.configs, "tsconfig.json"))
const tempTsConfig = join(packageRoot, "tsconfig.temp.json")
writeJson(tempTsConfig, {
    ...tsConfigData,
    include: ["src"],
    compilerOptions: {
        ...tsConfigData.compilerOptions,
        noEmit: false,
        module: "commonjs",
        outDir: "dist"
    }
})
try {
    shell(`pnpm tsc --project ${tempTsConfig}`)
    const outSrc = join(outRoot, "src")
    // not sure which setting to change to get it to compile here in the first place
    cpSync(outSrc, outRoot, {
        recursive: true,
        force: true
    })
    rmSync(outSrc, { recursive: true, force: true })
    writeJson(join(outRoot, "package.json"), { type: "commonjs" })
} finally {
    rmSync(tempTsConfig, { force: true })
}
console.log(`📦 Successfully built ${packageJson.name}!`)
