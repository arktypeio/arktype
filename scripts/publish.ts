import { fromPackageRoot, readFile, shell, writeFile } from "@re-/node"

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
