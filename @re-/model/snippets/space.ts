import { space } from "../src/index.js"

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

// Even recursive and cyclic types are precisely inferred
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
    // Throws:
    const validatedPackageData = redo.models.package.assert(packageDataFromFile)
    return validatedPackageData
}
