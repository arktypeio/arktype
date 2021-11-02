import { rmSync } from "fs"
import { basename, join } from "path"
import { stdout } from "process"
import { findPackageRoot, walkPaths } from "./fs.js"
import { shell } from "./shell.js"
import { transpileTs, findPackageName } from "./ts.js"

const packageRoot = findPackageRoot(process.cwd())
const packageName = findPackageName(packageRoot)
const outRoot = join(packageRoot, "out")
const typesOut = join(outRoot, "types")
const esmOut = join(outRoot, "esm")
const cjsOut = join(outRoot, "cjs")
const successMessage = `🎁 Successfully built ${packageName}!`

export type BuildTypesOptions = {
    noEmit?: boolean
}

export const checkTypes = () => buildTypes({ noEmit: true })

export const buildTypes = ({ noEmit }: BuildTypesOptions = {}) => {
    stdout.write(
        `${noEmit ? "🧐 Checking" : "⏳ Building"} types...`.padEnd(
            successMessage.length
        )
    )
    const cmdSuffix = noEmit
        ? "--noEmit"
        : `--declaration --emitDeclarationOnly --outDir ${typesOut}`
    shell(`npx tsc --jsx react --pretty ${cmdSuffix}`, {
        cwd: packageRoot,
        stdio: "pipe",
        suppressCmdStringLogging: true
    })
    if (!noEmit) {
        walkPaths(typesOut)
            .filter(
                (path) =>
                    basename(path) === "__tests__" ||
                    basename(path).endsWith(".stories.tsx")
            )
            .forEach((path) => rmSync(path, { recursive: true, force: true }))
    }
    stdout.write(`✅\n`)
}

export const buildEsm = async () => {
    transpileTs({
        packageRoot,
        toDir: esmOut,
        module: "esnext"
    })
}

export const buildCjs = async () => {
    transpileTs({
        packageRoot,
        toDir: cjsOut,
        module: "commonjs"
    })
}

export const transpile = async () => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    await Promise.all([buildEsm(), buildCjs()])
    stdout.write("✅\n")
}

export const redoTsc = async () => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    buildTypes()
    await transpile()
    console.log(successMessage)
}
