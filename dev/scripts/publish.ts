import { rmSync } from "node:fs"
import { join } from "node:path"
import { repoDirs } from "../common.js"
import { shell, walkPaths } from "#runtime"

const packageRoots = [repoDirs.root]

const cleanupNonDistributed = (outRoot: string) => {
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

shell("pnpm changeset publish")
