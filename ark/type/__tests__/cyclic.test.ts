import { attest } from "@arktype/attest"
import { scope } from "arktype"

const getCyclicScope = () =>
	scope({
		package: {
			name: "string",
			"dependencies?": "package[]",
			"contributors?": "contributor[]"
		},
		contributor: {
			email: "email",
			"packages?": "package[]"
		}
	})

type Package = ReturnType<typeof getCyclicScope>["infer"]["package"]

const getCyclicData = () => {
	const packageData = {
		name: "arktype",
		dependencies: [{ name: "typescript" }],
		contributors: [{ email: "david@arktype.io" }]
	} satisfies Package
	packageData.dependencies.push(packageData)
	return packageData
}

describe("cyclic", () => {
	it("cyclic union", () => {
		const $ = scope({
			a: { b: "b|false" },
			b: { a: "a|true" }
		})
		attest($.infer).type.toString.snap(
			"{ a: { b: false | { a: true | any; }; }; b: { a: true | { b: false | any; }; }; }"
		)
	})
	it("cyclic intersection", () => {
		const $ = scope({
			a: { b: "b&a" },
			b: { a: "a&b" }
		})
		attest($.infer).type.toString.snap(
			"{ a: { b: { a: { b: any; a: any; }; b: any; }; }; b: { a: { b: { a: any; b: any; }; a: any; }; }; }"
		)
	})
	// TODO: reenable
	it("cyclic", () => {
		const types = scope({ a: { b: "b" }, b: { a: "a" } }).export()
		// attest(types.a.node).snap({
		//     object: { props: { b: "b" } }
		// })
		// Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
		attest<{
			b: {
				a: {
					b: {
						a: any
					}
				}
			}
		}>(types.a.infer)
		attest<{
			b: {
				a: any
			}
		}>(types.b.infer.a.b.a.b.a.b.a)

		// @ts-expect-error
		attest(types.a.infer.b.a.b.c).type.errors.snap(
			`Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
		)
	})
	it("allows valid", () => {
		const types = getCyclicScope().export()
		const data = getCyclicData()
		attest(types.package(data).out).snap({
			name: "arktype",
			dependencies: [{ name: "typescript" }, "(cycle)" as any as Package],
			contributors: [{ email: "david@arktype.io" }]
		})
	})
	it("adds problems on invalid", () => {
		const types = getCyclicScope().export()
		const data = getCyclicData()
		data.contributors[0].email = "ssalbdivad"
		attest(types.package(data).errors?.summary).snap(
			"dependencies/1/contributors/0/email must be a valid email (was 'ssalbdivad')\ncontributors/0/email must be a valid email (was 'ssalbdivad')"
		)
	})
	it("can include cyclic data in message", () => {
		const data = getCyclicData()
		const nonSelfDependent = getCyclicScope().type([
			"package",
			":",
			(p) => !p.dependencies?.some((d) => d.name === p.name)
		])
		attest(nonSelfDependent(data).errors?.summary).snap(
			'Must be valid (was {"name":"arktype","dependencies":[{"name":"typescript"},"(cycle)"],"contributors":[{"email":"david@arktype.io"}]})'
		)
	})

	it("equivalent cycles reduce", () => {
		// // TODO: reduce this case or create an issue
		// const $ = scope({
		//     user: {
		//         friends: "user[]",
		//         name: "string"
		//     },
		//     admin: {
		//         friends: "user[]",
		//         name: "string"
		//     }
		// })
	})

	it("union cyclic reference", () => {
		const types = scope({
			a: {
				b: "b"
			},
			b: {
				a: "a|3"
			}
		})
		attest(types.infer).type.toString.snap(
			"{ a: { b: { a: 3 | any; }; }; b: { a: 3 | { b: any; }; }; }"
		)
	})
	it("intersect cyclic reference", () => {
		const types = scope({
			a: {
				b: "b"
			},
			b: {
				c: "a&b"
			}
		})
		attest(types.infer).type.toString.snap(
			"{ a: { b: { c: { b: any; c: any; }; }; }; b: { c: { b: any; c: any; }; }; }"
		)
	})
})
