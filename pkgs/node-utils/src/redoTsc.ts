import { rmSync } from "fs"
import { basename, join } from "path"
import ts from "typescript"
import { findPackageRoot, walkPaths } from "./fs.js"
import { shellAsync } from "./shell.js"
import { transpileTs, findPackageName } from "./ts.js"

const packageRoot = findPackageRoot(process.cwd())
const packageName = findPackageName(packageRoot)
const outRoot = join(packageRoot, "out")
const typesOut = join(outRoot, "types")
const esmOut = join(outRoot, "esm")
const cjsOut = join(outRoot, "cjs")

export const buildTypes = async () => {
    await shellAsync(
        `npx tsc --declaration --emitDeclarationOnly --outDir ${typesOut}`,
        {
            cwd: packageRoot
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

export const buildEsm = async () =>
    transpileTs({
        packageRoot,
        toDir: esmOut,
        module: ts.ModuleKind.ESNext
    })

export const buildCjs = async () =>
    transpileTs({
        packageRoot,
        toDir: cjsOut,
        module: ts.ModuleKind.CommonJS
    })

export const redoTsc = async () => {
    console.log(`redoTsc🔨: Building ${packageName}...`)
    await buildTypes()
    await buildEsm()
    await buildCjs()
    console.log(`redoTsc🔨: Finished building ${packageName}.`)
}

redoTsc()
//  catch (e) {
//         console.log("redoTsc🔨:❗️Build failed due to the following error:❗️")
//         console.log(e)
//         process.exit(1)
//     }
