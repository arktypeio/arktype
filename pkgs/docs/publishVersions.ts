import { shell } from "@re-/node"
import modelPackageJson from "../model/package.json"

const versionedPackages = [modelPackageJson]

versionedPackages.forEach((data) => {
    const unscopedName = data.name.replace("@re-/", "")
    shell(`docusaurus docs:version:${unscopedName} ${data.version}`)
})
