import { rmSync } from "node:fs"
import { join } from "node:path"
import { packageRoots } from "./common.js"
import {
    fromPackageRoot,
    readFile,
    shell,
    walkPaths,
    writeFile
} from "@re-/node"

export const cleanupNonDistributed = (outRoot: string) => {
    const nonDistributedDirs = walkPaths(outRoot, {
        include: (path) =>
            path.endsWith("__tests__") || path.endsWith("__snippets__")
    })
    for (const path of nonDistributedDirs) {
        rmSync(path, { recursive: true, force: true })
    }
}

for (const packageRoot of packageRoots) {
    cleanupNonDistributed(join(packageRoot, "dist"))
}

const NPM_TOKEN = process.env.NPM_TOKEN
if (!NPM_TOKEN) {
    throw new Error(
        `Unable to publish as NPM_TOKEN is not set in your environment.`
    )
}
const npmrcPath = fromPackageRoot(".npmrc")
const contents = readFile(npmrcPath)
writeFile(
    npmrcPath,
    contents + "\n" + `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`
)

shell("pnpm changeset publish")
