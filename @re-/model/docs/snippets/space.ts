import { space } from "../../src/index.js"

// Spaces are collections of models that can reference each other.
export const redo = space({
    package: {
        name: "string",
        version: "string",
        dependencies: "package[]",
        contributors: "contributor[]"
    },
    contributor: {
        name: "string",
        isInternal: "boolean",
        packages: "package[]"
    }
})

// Recursive and cyclic types are inferred to arbitrary depth.
export type Package = typeof redo.types.package

export const readPackageData = () => {
    return {
        name: "@re-/model",
        version: "latest",
        dependencies: [
            {
                name: "@re-/tools",
                version: 2.2,
                dependencies: []
            }
        ],
        contributors: [
            {
                name: "David Blass",
                isInternal: true
            }
        ]
    }
}

export const getValidatedPackageData = () => {
    const packageDataFromFile = readPackageData()
    // Throws: `Error: Encountered errors at the following paths:
    //    dependencies/0/version: 2.2 is not assignable to string.
    //    dependencies/0/contributors: Required value of type contributor[] was missing.
    //    contributors/0/packages: Required value of type package[] was missing.`
    const validatedPackageData = redo.models.package.assert(packageDataFromFile)
    return validatedPackageData
}
