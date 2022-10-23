import { join, relative } from "node:path"
import {
    findPackageRoot,
    readPackageJson,
    walkPaths
} from "../@arktype/node/src/index.js"

export const repoRoot = findPackageRoot()
export const isProd = () => process.argv.includes("--prod") || !!process.env.CI

export const getPackageDataFromCwd = () => {
    const cwd = process.cwd()
    const packageRoot = findPackageRoot(cwd)
    const packageJson = readPackageJson(packageRoot)
    const packageName = packageJson.name
    const tsConfig = relative(cwd, join(packageRoot, "tsconfig.json"))
    const srcRoot = relative(cwd, join(packageRoot, "src"))
    const outRoot = relative(cwd, join(packageRoot, "dist"))
    const typesOut = join(outRoot, "types")
    const mjsOut = join(outRoot, "mjs")
    const cjsOut = join(outRoot, "cjs")
    const inFiles = walkPaths(srcRoot, {
        excludeDirs: true
    })
    return {
        packageRoot,
        packageJson,
        packageName,
        tsConfig,
        srcRoot,
        outRoot,
        typesOut,
        mjsOut,
        cjsOut,
        inFiles
    }
}
