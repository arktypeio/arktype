import { existsSync, renameSync, rmSync } from "node:fs"
import { join, relative } from "node:path"
import { stdout } from "node:process"
import {
    findPackageRoot,
    readJson,
    readPackageJson,
    requireResolve,
    shell,
    walkPaths,
    writeJson
} from "../@re-/node/src/index.js"

const cwd = process.cwd()
const packageRoot = findPackageRoot(cwd)
const packageJson = readPackageJson(packageRoot)
const packageName = packageJson.name
const tsconfig = relative(cwd, join(packageRoot, "tsconfig.json"))
const srcRoot = relative(cwd, join(packageRoot, "src"))
const outRoot = relative(cwd, join(packageRoot, "dist"))
const typesOut = join(outRoot, "types")
const mjsOut = join(outRoot, "mjs")
const cjsOut = join(outRoot, "cjs")
const inFiles = walkPaths(srcRoot, {
    ignoreDirsMatching: /\$test$/,
    excludeDirs: true
})
const successMessage = `🎁 Successfully built ${packageName}!`

export const redoTsc = (options?: RedoTscOptions) => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    if (!options?.skip?.types) {
        buildTypes()
    }
    const transpilers = Object.keys(defaultTranspilers)
        .filter(
            (name) => !options?.skip?.[name as keyof typeof defaultTranspilers]
        )
        .map(
            (name) =>
                defaultTranspilers[name as keyof typeof defaultTranspilers]
        )
    transpile(transpilers)
    console.log(successMessage)
}

export const buildTypes = () => {
    stdout.write("⏳ Building types...".padEnd(successMessage.length))
    if (!existsSync(tsconfig)) {
        throw new Error(`Expected config at '${tsconfig}' did not exist.`)
    }
    const config = readJson(tsconfig)
    const tempTsConfig = join(packageRoot, "tsconfig.temp.json")
    writeJson(tempTsConfig, {
        ...config,
        files: inFiles
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

type SwcOptions = {
    outDir: string
    moduleType?: string
    sourceMaps?: boolean
}

const swc = ({ outDir, moduleType, sourceMaps }: SwcOptions) => {
    let cmd = `node ${requireResolve(
        "@swc/cli"
    )} --out-dir ${outDir} -C jsc.target=es2020 --quiet `
    if (moduleType) {
        cmd += `-C module.type=${moduleType} `
    }
    if (sourceMaps) {
        cmd += `--source-maps inline `
    }
    cmd += inFiles.join(" ")
    shell(cmd)
}

export const buildEsm = () => {
    swc({ outDir: mjsOut, sourceMaps: true })
    writeJson(join(mjsOut, "package.json"), { type: "module" })
}

export const buildCjs = () => {
    swc({ outDir: cjsOut, moduleType: "commonjs", sourceMaps: true })
    writeJson(join(cjsOut, "package.json"), { type: "commonjs" })
}

type Transpiler = () => void

const defaultTranspilers = {
    esm: buildEsm,
    cjs: buildCjs
} as const

export const transpile = (
    transpilers: Transpiler[] = Object.values(defaultTranspilers)
) => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    Object.values(transpilers).map((transpiler) => transpiler())
    stdout.write("✅\n")
}

export type RedoTscOptions = {
    skip?: {
        cjs?: boolean
        esm?: boolean
        types?: boolean
    }
}

redoTsc({
    skip: {
        esm: process.argv.includes("--skipEsm"),
        cjs: process.argv.includes("--skipCjs"),
        types: process.argv.includes("--skipTypes")
    }
})
