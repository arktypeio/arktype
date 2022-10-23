export default `import { space } from "arktype"

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
    name: "@arktype/io",
    dependencies: [{ name: "@arktype/tools", dependencies: [] }],
    contributors: [{ email: "david@sharktypeio" }]
})

// \`Encountered errors at the following paths:
//   dependencies/0/contributors: Required value of type contributor[] was missing.
//   contributors/0/email: "david@sharktypeio" is not assignable to email.\`
export const { problems } = types.package.check(readPackageData())
`
