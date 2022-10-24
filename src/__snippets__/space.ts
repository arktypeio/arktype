import { space } from "../api.js"

// Spaces are collections of types that can reference each other.
export const types = space({
    package: {
        name: "string",
        dependencies: "package[]?",
        devDependencies: "package[]?",
        contributors: "contributor[]?"
    },
    contributor: {
        // Subtypes like 'email' are inferred like 'string' but provide additional validation at runtime.
        email: "email",
        packages: "package[]?"
    }
})

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
export const readPackageData = () => {
    const arktypePackageData = {
        name: "arktype",
        dependencies: [],
        devDependencies: [
            { name: "@arktype/check", dependencies: [] as Package[] }
        ],
        contributors: [{ email: "david@sharktypeio" }]
    }
    arktypePackageData.devDependencies[0].dependencies.push(arktypePackageData)
    return arktypePackageData
}

// TODO: Update
// `Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@sharktypeio" is not assignable to email.`
export const { problems } = types.package.check(readPackageData())
