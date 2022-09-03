import { join, relative } from "node:path"
import {
    findPackageRoot,
    fromPackageRoot,
    readPackageJson,
    walkPaths
} from "../@re-/node/src/index.js"

export const cwd = process.cwd()
export const packageRoot = findPackageRoot(cwd)
export const packageJson = readPackageJson(packageRoot)
export const packageName = packageJson.name
export const tsConfig = relative(cwd, join(packageRoot, "tsconfig.json"))
export const srcRoot = relative(cwd, join(packageRoot, "src"))
export const outRoot = relative(cwd, join(packageRoot, "dist"))
export const typesOut = join(outRoot, "types")
export const mjsOut = join(outRoot, "mjs")
export const cjsOut = join(outRoot, "cjs")
export const inFiles = walkPaths(srcRoot, {
    excludeDirs: true
})
export const isProd = process.argv.includes("--prod") || !!process.env.CI

export const repoRoot = fromPackageRoot()
export const packageNames = ["assert", "node", "tools", "type"]
export const packageRoots = packageNames.map((_) => join(repoRoot, "@re-", _))
