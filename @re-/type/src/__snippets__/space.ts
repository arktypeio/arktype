import { space } from "../api.js"

// Spaces are collections of types that can reference each other.
export const types = space({
    package: {
        name: "string",
        dependencies: "package[]",
        contributors: "contributor[]"
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
export const readPackageData = () => ({
    name: "@re-/type",
    dependencies: [{ name: "@re-/tools", dependencies: [] }],
    contributors: [{ email: "david@redodev" }]
})

// `Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@redodev" is not assignable to email.`
export const { errors } = types.package.check(readPackageData())
