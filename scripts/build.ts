import { existsSync, renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import {
    readJson,
    requireResolve,
    shell,
    writeJson
} from "../@re-/node/src/index.js"
import {
    cjsOut,
    inFiles,
    isProd,
    mjsOut,
    outRoot,
    packageName,
    packageRoot,
    tsConfig,
    typesOut
} from "./common.js"

const successMessage = `🎁 Successfully built ${packageName}!`

export const redoTsc = (config: RedoTscConfig) => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    if (!config?.skip?.types) {
        buildTypes()
    }
    transpile(config)
    console.log(successMessage)
}

export const buildTypes = () => {
    stdout.write("⏳ Building types...".padEnd(successMessage.length))
    if (!existsSync(tsConfig)) {
        throw new Error(`Expected config at '${tsConfig}' did not exist.`)
    }
    const config = readJson(tsConfig)
    const tempTsConfig = join(packageRoot, "tsconfig.temp.json")
    writeJson(tempTsConfig, {
        ...config,
        files: inFiles.filter((path) => !/__tests__|__snippets__/.test(path))
    })
    try {
        const cmd = `pnpm tsc --project ${tempTsConfig} --outDir ${outRoot} --emitDeclarationOnly`
        shell(cmd, {
            cwd: packageRoot
        })
        renameSync(join(outRoot, "src"), typesOut)
    } finally {
        rmSync(tempTsConfig)
    }
    stdout.write(`✅\n`)
}

export const transpile = (config: RedoTscConfig) => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    if (!config.skip.esm) {
        buildEsm()
    }
    if (!config.skip.cjs) {
        buildCjs()
    }
    stdout.write("✅\n")
}

type SwcOptions = {
    outDir: string
    moduleType?: string
}

const swc = ({ outDir, moduleType }: SwcOptions) => {
    let cmd = `node ${requireResolve(
        "@swc/cli"
    )} --out-dir ${outDir} -C jsc.target=es2020 --quiet `
    if (moduleType) {
        cmd += `-C module.type=${moduleType} `
    }
    if (!isProd) {
        cmd += `--source-maps inline `
    }
    cmd += inFiles.join(" ")
    shell(cmd)
}

export const buildEsm = () => {
    swc({ outDir: mjsOut })
    writeJson(join(mjsOut, "package.json"), { type: "module" })
}

export const buildCjs = () => {
    swc({ outDir: cjsOut, moduleType: "commonjs" })
    writeJson(join(cjsOut, "package.json"), { type: "commonjs" })
}

export type RedoTscOptions = {
    skip?: {
        cjs?: boolean
        esm?: boolean
        types?: boolean
    }
}

export type RedoTscConfig = Required<RedoTscOptions>

redoTsc({
    skip: {
        esm: process.argv.includes("--skipEsm"),
        cjs: process.argv.includes("--skipCjs"),
        types: process.argv.includes("--skipTypes")
    }
})
