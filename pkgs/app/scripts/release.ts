import { ensureDir, shell } from "@re-do/node"
import { join } from "path"
import { writeFileSync, renameSync, rmSync } from "fs"
import { releaseDir, packageJsonContents } from "./common"

const prepareRelease = () => {
    rmSync(releaseDir, { recursive: true, force: true })
    const releaseDependenciesDir = join(releaseDir, "dependencies")
    ensureDir(releaseDependenciesDir)
    // Only install non-bundled dependencies
    const releaseDependencies = {
        "playwright-core": packageJsonContents.dependencies["playwright-core"],
        "electron-redux": packageJsonContents.dependencies["electron-redux"],
        "react-refresh": packageJsonContents.dependencies["react-refresh"]
    }
    const releasePackageJsonContents = JSON.stringify({
        ...packageJsonContents,
        dependencies: releaseDependencies,
        devDependencies: {}
    })
    writeFileSync(
        join(releaseDependenciesDir, "package.json"),
        releasePackageJsonContents
    )
    shell("npm install", {
        cwd: releaseDependenciesDir
    })
    const nodeModulesSrcDir = join(releaseDependenciesDir, "node_modules")
    const nodeModulesDestDir = join(releaseDependenciesDir, "external")
    renameSync(nodeModulesSrcDir, nodeModulesDestDir)
    rmSync(join(nodeModulesDestDir, ".bin"), { recursive: true, force: true })
}

export const createRelease = () => {
    prepareRelease()
    shell(
        `electron-builder --config electron-builder.config.js --publish never`
    )
}
