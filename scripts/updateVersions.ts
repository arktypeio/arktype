/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import { join } from "node:path"
import {
    fromHere,
    fromPackageRoot,
    readFile,
    readJson,
    readPackageJson,
    shell,
    writeFile,
    writeJson
} from "@re-/node"
import { docgen } from "./docgen/main.js"

const suffixes = {
    model: "alpha"
}

const forEachPackageWithSuffix = (transformer: SuffixTransformer) => {
    for (const [name, suffix] of Object.entries(suffixes)) {
        const packagePath = fromHere("..", "@re-", name)
        const packageJsonPath = join(packagePath, "package.json")
        const changelogPath = join(packagePath, "CHANGELOG.md")
        const packageJson = readJson(packageJsonPath)
        const changelog = readFile(changelogPath)
        const transformed = transformer({
            packageJson,
            changelog,
            name,
            suffix
        })
        if (transformed.packageJson) {
            writeJson(packageJsonPath, transformed.packageJson)
        }
        if (transformed.changelog) {
            writeFile(changelogPath, transformed.changelog)
        }
    }
}

forEachPackageWithSuffix(({ packageJson, suffix }) => {
    // Temporarily remove the suffix, if it exists, so changesets can handle versioning
    if (packageJson.version.endsWith(suffix)) {
        packageJson.version = packageJson.version.slice(0, -suffix.length - 1)
    }
    return {
        packageJson
    }
})

shell("pnpm changeset version")

forEachPackageWithSuffix(({ packageJson, changelog, suffix }) => {
    const versionWithSuffix = packageJson.version + `-${suffix}`
    const updatedChangelog = changelog.replaceAll(
        packageJson.version,
        versionWithSuffix
    )
    packageJson.version = versionWithSuffix
    return { packageJson, changelog: updatedChangelog }
})

type SuffixTransformer = (args: {
    packageJson: any
    changelog: string
    name: string
    suffix: string
}) => {
    packageJson?: any
    changelog?: string
}

docgen()

const REDO_DEV_DIR = fromPackageRoot("redo.dev")

const docusaurusVersionedPackages = [
    {
        packageRoot: fromPackageRoot("@re-", "model"),
        docsName: "model"
    }
]

shell("pnpm in", {
    cwd: REDO_DEV_DIR
})

for (const { packageRoot, docsName } of docusaurusVersionedPackages) {
    const packageJson = readPackageJson(packageRoot)
    const existingVersions: string[] = readJson(
        join(REDO_DEV_DIR, `${docsName}_versions.json`)
    )
    if (!existingVersions.includes(packageJson.version)) {
        shell(
            `pnpm docusaurus docs:version:${docsName} ${packageJson.version}`,
            {
                cwd: REDO_DEV_DIR
            }
        )
    }
}
