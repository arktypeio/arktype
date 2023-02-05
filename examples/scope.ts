import { scope } from "../api.js"

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
}).compile()

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
export const readPackageData = () => {
    const packageData: Package = {
        name: "arktype",
        dependencies: [],
        devDependencies: [{ name: "typescript" }],
        contributors: [{ email: "david@sharktypeio" }]
    }
    packageData.devDependencies![0].dependencies = [packageData]
    return packageData
}

export const { problems } = types.package(readPackageData())
