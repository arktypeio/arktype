import { space } from "../src/index.js"

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

// Throws: "At path bestFriend/groups/0, required keys 'members' were missing."
redo.models.package.assert(readPackageData())
