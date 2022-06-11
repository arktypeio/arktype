import { existsSync, renameSync, rmSync } from "node:fs"
import { join, relative } from "node:path"
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
    excludeDirs: true
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
        const cmd = `pnpm tsc --project ${tempTsConfig} --outDir ${outRoot} --emitDeclarationOnly`
        shell(cmd, {
            cwd: packageRoot,
            stdio: "pipe",
            suppressCmdStringLogging: true
        })
        renameSync(join(outRoot, "src"), typesOut)
        const typesPackageJson = buildDistPackageJson({
            transformImportsPath: (path) =>
                path.endsWith(".js") ? path.slice(0, -3) + ".d.ts" : path
        })
        if (Object.keys(typesPackageJson).length) {
            // If we needed to remap any imports from the original package.json,
            // create a package.json in typesOut
            writeJson(join(typesOut, "package.json"), typesPackageJson)
        }
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
    shell(cmd, { suppressCmdStringLogging: true })
}

type BuildDistPackageJsonOptions = {
    type?: "commonjs" | "module"
    transformImportsPath?: (path: string) => string
}

const buildDistPackageJson = ({
    type,
    transformImportsPath
}: BuildDistPackageJsonOptions) => {
    const contents: any = {}
    if (type) {
        contents.type = type
    }
    if (packageJson.imports) {
        for (const [alias, path] of Object.entries(packageJson.imports)) {
            if (typeof path === "string" && path.startsWith("./src/")) {
                if (!contents.imports) {
                    contents.imports = {}
                }
                let transformedPath = path.replace("./src/", "./")
                if (transformImportsPath) {
                    transformedPath = transformImportsPath(transformedPath)
                }
                contents.imports[alias] = transformedPath
            }
        }
    }
    return contents
}

export const buildEsm = () => {
    swc({ outDir: mjsOut, sourceMaps: true })
    writeJson(
        join(mjsOut, "package.json"),
        buildDistPackageJson({ type: "module" })
    )
}

export const buildCjs = () => {
    swc({ outDir: cjsOut, moduleType: "commonjs", sourceMaps: true })
    writeJson(
        join(cjsOut, "package.json"),
        buildDistPackageJson({ type: "commonjs" })
    )
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

export const runReTsc = () =>
    redoTsc({
        skip: {
            esm: process.argv.includes("--skipEsm"),
            cjs: process.argv.includes("--skipCjs"),
            types: process.argv.includes("--skipTypes")
        }
    })
