import { transform } from "@re-/tools"
import { chmodSync, existsSync, rmSync } from "fs"
import { join } from "path"
import { stdout } from "process"
import { findPackageRoot, walkPaths, readPackageJson } from "./fs.js"
import { shell } from "./shell.js"
import { transpileTs, findPackageName, isTest } from "./ts.js"

const packageRoot = findPackageRoot(process.cwd())
const packageJson = readPackageJson(packageRoot)
const packageName = packageJson.name
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
    if (!noEmit) {
        if (!existsSync(typesOut)) {
            throw new Error(
                `Expected type output did not exist at '${typesOut}'.`
            )
        }
        walkPaths(typesOut)
            .filter((path) => isTest(path))
            .forEach((path) => rmSync(path, { recursive: true, force: true }))
    }
    stdout.write(`✅\n`)
}

export const buildEsm = () =>
    transpileTs({
        packageRoot,
        toDir: esmOut,
        module: "esnext"
    })

export const buildCjs = () =>
    transpileTs({
        packageRoot,
        toDir: cjsOut,
        module: "commonjs"
    })

type Transpiler = () => void

const defaultTranspilers = {
    esm: buildEsm,
    cjs: buildCjs
}

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

export const redoTsc = (options?: RedoTscOptions) => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    if (!options?.skip?.types) {
        buildTypes(options?.types)
    }
    const transpilers = transform(
        defaultTranspilers,
        ([name, transpiler]) =>
            options?.skip?.[name] ? null : [name, transpiler],
        { asArray: "always" }
    )
    transpile(transpilers)
    console.log(successMessage)
}

export const runRedoTsc = () =>
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
