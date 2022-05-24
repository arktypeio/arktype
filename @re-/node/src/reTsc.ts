import { chmodSync, existsSync, renameSync, rmSync } from "node:fs"
import { basename, join, relative } from "node:path"
import { stdout } from "node:process"
import {
    findPackageRoot,
    readJson,
    readPackageJson,
    requireResolve,
    walkPaths,
    writeJson
} from "./fs.js"
import { shell } from "./shell.js"

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
    excludeDirs: true,
    exclude: (path) => path.includes("__tests__")
})
const successMessage = `🎁 Successfully built ${packageName}!`

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
        const cmd = `pnpm tsc --project ${tempTsConfig} --outDir ${outRoot}`
        shell(cmd, {
            cwd: packageRoot,
            stdio: "pipe",
            suppressCmdStringLogging: true
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
}

const swc = ({ outDir, moduleType }: SwcOptions) => {
    let cmd = `node ${requireResolve(
        "@swc/cli"
    )} --out-dir ${outDir} -C jsc.target=es2015 --quiet `
    if (moduleType) {
        cmd += ` -C module.type=${moduleType} `
    }
    cmd += inFiles.join(" ")
    shell(cmd, { suppressCmdStringLogging: true })
}

export const buildEsm = () => {
    swc({ outDir: mjsOut })
    writeJson(join(mjsOut, "package.json"), { type: "module" })
}

export const buildCjs = () => {
    swc({ outDir: cjsOut, moduleType: "commonjs" })
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
    if (packageJson.bin) {
        for (const executable of Object.values(packageJson.bin)) {
            if (typeof executable === "string" && existsSync(executable)) {
                chmodSync(executable, "755")
            }
        }
    }
    stdout.write("✅\n")
}

export type RedoTscOptions = {
    skip?: {
        cjs?: boolean
        esm?: boolean
        types?: boolean
    }
}

export const removeTests = () => {
    if (!existsSync(outRoot)) {
        return
    }

    for (const path of walkPaths(outRoot).filter(
        (path) => basename(path) === "__tests__"
    )) {
        rmSync(path, { recursive: true, force: true })
    }
}

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
    removeTests()
    console.log(successMessage)
}

export const runReTsc = () =>
    redoTsc({
        skip: {
            esm: process.argv.includes("--skipEsm"),
            cjs: process.argv.includes("--skipCjs"),
            types: process.argv.includes("--skipTypes")
        }
    })
