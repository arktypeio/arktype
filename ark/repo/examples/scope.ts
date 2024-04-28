import { scope } from "arktype"

// Scopes are collections of types that can reference each other.
export const types = scope({
	package: {
		name: "string",
		"dependencies?": "package[]",
		"contributors?": "contributor[]"
	},
	contributor: {
		// Subtypes like 'email' are inferred like 'string' but provide additional validation at runtime.
		email: "email",
		"packages?": "package[]"
	}
}).export()

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
const packageData: Package = {
	name: "arktype",
	dependencies: [{ name: "typescript" }],
	contributors: [{ email: "david@sharktypeio" }]
}
packageData.dependencies![0].dependencies = [packageData]

export const out = types.package(packageData)
