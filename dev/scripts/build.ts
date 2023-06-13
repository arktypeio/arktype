import { cpSync, rmSync } from "node:fs"
import { join } from "node:path"
import { readJson, writeJson } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"
import { repoDirs } from "./common.js"

const packageRoot = process.cwd()
const outRoot = join(packageRoot, "dist")
const packageJson = readJson(join(packageRoot, "package.json"))

const buildFormat = (module: "commonjs" | "esnext") => {
    const outDir = join(outRoot, module === "commonjs" ? "cjs" : "mjs")

    writeJson(tempTsConfig, {
        ...tsConfigData,
        include: ["src", "dev/utils"],
        compilerOptions: {
            ...tsConfigData.compilerOptions,
            noEmit: false,
            module,
            outDir
        }
    })
    try {
        shell(`pnpm tsc --project ${tempTsConfig}`)
        const outSrc = join(outDir, "src")
        // not sure which setting to change to get it to compile here in the first place
        cpSync(outSrc, outDir, {
            recursive: true,
            force: true
        })
        if (module === "commonjs") {
            writeJson(join(outDir, "package.json"), {
                type: "commonjs"
            })
        }
        rmSync(outSrc, { recursive: true, force: true })
    } finally {
        rmSync(tempTsConfig, { force: true })
    }
}

console.log(`🔨 Building ${packageJson.name}...`)
rmSync(outRoot, { recursive: true, force: true })
const tsConfigData = readJson(join(repoDirs.configs, "tsconfig.base.json"))
const tempTsConfig = join(packageRoot, "tsconfig.temp.json")
buildFormat("esnext")
buildFormat("commonjs")
console.log(`📦 Successfully built ${packageJson.name}!`)
