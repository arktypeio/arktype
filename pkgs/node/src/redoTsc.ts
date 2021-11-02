import { rmSync } from "fs"
import { basename, join } from "path"
import { findPackageRoot, walkPaths } from "./fs.js"
import { shell, shellAsync } from "./shell.js"
import { transpileTs, findPackageName } from "./ts.js"

const packageRoot = findPackageRoot(process.cwd())
const packageName = findPackageName(packageRoot)
const outRoot = join(packageRoot, "out")
const typesOut = join(outRoot, "types")
const esmOut = join(outRoot, "esm")
const cjsOut = join(outRoot, "cjs")

export const buildTypes = async () => {
    shell(
        `npx tsc --declaration --emitDeclarationOnly --pretty --outDir ${typesOut}`,
        {
            cwd: packageRoot,
            suppressCmdStringLogging: true
        }
    )
    walkPaths(typesOut)
        .filter(
            (path) =>
                basename(path) === "__tests__" ||
                basename(path).endsWith(".stories.tsx")
        )
        .forEach((path) => rmSync(path, { recursive: true, force: true }))
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

export const redoTsc = async () => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    console.log(`⏳ Building types...`)
    await buildTypes()
    console.log(`⌛ Transpiling...`)
    await Promise.all([buildEsm(), buildCjs()])
    console.log(`✅ Finished building ${packageName}.`)
}

redoTsc()
