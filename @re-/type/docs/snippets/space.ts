import { space } from "../../src/index.js"

// Spaces are collections of models that can reference each other.
export const models = space({
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

// Cyclic models are inferred to arbitrary depth...
export type Package = typeof models.package.infer

// And can validate cyclic data.
export const readPackageData = () => ({
    name: "@re-/type",
    dependencies: [{ name: "@re-/tools", dependencies: [] }],
    contributors: [{ email: "david@redodev" }]
})

// `Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@redodev" is not assignable to email.`
export const { error } = models.package.check(readPackageData())
