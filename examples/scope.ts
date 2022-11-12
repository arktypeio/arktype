import { scope } from "../arktype.js"

// Scopes are collections of types that can reference each other.
export const types = scope({
    package: {
        name: "string",
        "dependencies?": "package[]",
        "devDependencies?": "package[]",
        "contributors?": "contributor[]"
    },
    contributor: {
        // Subtypes like 'email' are inferred like 'string' but provide additional validation at runtime.
        email: "email",
        "packages?": "package[]"
    }
})

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
export const readPackageData = () => {
    const packageData: Package = {
        name: "arktype",
        dependencies: [],
        devDependencies: [{ name: "@arktype/test" }],
        contributors: [{ email: "david@sharktypeio" }]
    }
    packageData.devDependencies![0].dependencies = [packageData]
    return packageData
}

// TODO: Update
// `Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@sharktypeio" is not assignable to email.`
export const { problems } = types.package.check(readPackageData())
