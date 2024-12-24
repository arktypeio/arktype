import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

// false
// const t = type({ foo: "string" }).extends("Record<string, string>")

flatMorph(ark.internal.resolutions, (k, v) => [k, v])

console.log(Object.keys(ark.internal.resolutions))

export const types = type
	.scope({
		package: {
			name: "string",
			"dependencies?": "package[]",
			"contributors?": "contributor[]"
		},
		contributor: {
			email: "string.email",
			"packages?": "package[]"
		}
	})
	.export()

export type Package = typeof types.package.infer

const packageData: Package = {
	name: "arktype",
	dependencies: [{ name: "typescript" }],
	contributors: [{ email: "david@sharktypeio" }]
}

// update arktype to depend on itself
packageData.dependencies![0].dependencies = [packageData]

const out = types.package(packageData)

console.log(out.toString())
