import { fromHere, readPackageJson, shell } from "@re-/node"
const modelPackageJson = readPackageJson(fromHere("..", "@re-", "model"))

const versionedPackages = [modelPackageJson]

for (const data of versionedPackages) {
    const unscopedName = data.name.replace("@re-/", "")
    shell(`docusaurus docs:version:${unscopedName} ${data.version}`)
}
