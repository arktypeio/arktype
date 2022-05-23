import { chmodSync, existsSync, rmSync } from "fs"
import { basename, join } from "path"
import { stdout } from "process"
import {
    findPackageRoot,
    walkPaths,
    readPackageJson,
    requireResolve,
    writeJson
} from "./fs.js"
import { shell } from "./shell.js"

const packageRoot = findPackageRoot(process.cwd())
const packageJson = readPackageJson(packageRoot)
const packageName = packageJson.name
const srcRoot = join(packageRoot, "src")
const buildTsconfigPath = join(packageRoot, "tsconfig.build.json")
const outRoot = join(packageRoot, "out")
const typesOut = join(outRoot, "types")
const esmOut = join(outRoot, "esm")
const cjsOut = join(outRoot, "cjs")
const successMessage = `🎁 Successfully built ${packageName}!`

export type BuildTypesOptions = {
    asBuild?: boolean
    noEmit?: boolean
}

export const checkTypes = () => buildTypes({ noEmit: true })

export const buildTypes = ({ noEmit, asBuild }: BuildTypesOptions = {}) => {
    stdout.write(
        `${noEmit ? "🧐 Checking" : "⏳ Building"} types...`.padEnd(
            successMessage.length
        )
    )
    let cmd = "npx tsc"
    if (existsSync(buildTsconfigPath)) {
        cmd += ` --project ${buildTsconfigPath}`
    }
    if (asBuild) {
        cmd += " --build"
    } else {
        if (noEmit) {
            cmd += " --noEmit"
        } else {
            cmd += ` --declaration --emitDeclarationOnly --outDir ${typesOut}`
        }
    }
    shell(cmd, {
        cwd: packageRoot,
        stdio: "pipe",
        suppressCmdStringLogging: true
    })
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
    cmd += srcRoot
    shell(cmd, { suppressCmdStringLogging: true })
}

export const buildEsm = () => {
    swc({ outDir: esmOut })
    writeJson(join(esmOut, "package.json"), { type: "module" })
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
        Object.values(packageJson.bin).forEach((executable) => {
            if (typeof executable === "string" && existsSync(executable)) {
                chmodSync(executable, "755")
            }
        })
    }
    stdout.write("✅\n")
}

export type RedoTscOptions = {
    types?: BuildTypesOptions
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
    walkPaths(outRoot)
        .filter((path) => basename(path) === "__tests__")
        .forEach((path) => rmSync(path, { recursive: true, force: true }))
}

export const redoTsc = (options?: RedoTscOptions) => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    if (!options?.skip?.types) {
        buildTypes(options?.types)
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
        types: {
            asBuild: process.argv.includes("--asBuild"),
            noEmit: process.argv.includes("--noEmitTypes")
        },
        skip: {
            esm: process.argv.includes("--skipEsm"),
            cjs: process.argv.includes("--skipCjs"),
            types: process.argv.includes("--skipTypes")
        }
    })
