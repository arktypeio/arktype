import { shell } from "@re-/node"
import modelPackageJson from "../model/package.json"

const versionedPackages = [modelPackageJson]

for (const data of versionedPackages) {
    const unscopedName = data.name.replace("@re-/", "")
    shell(`docusaurus docs:version:${unscopedName} ${data.version}`)
}
