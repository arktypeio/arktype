import { attest } from "@arktype/test"
import { scope } from "../type/main.js"
import { suite, test } from "mocha"

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

suite("cyclic", () => {
	test("cyclic union", () => {
		const $ = scope({
			a: { b: "b|false" },
			b: { a: "a|true" }
		})
		attest($.infer).types.toString.snap(
			"{ a: { b: false | { a: true | any; }; }; b: { a: true | { b: false | any; }; }; }"
		)
	})
	test("cyclic intersection", () => {
		const $ = scope({
			a: { b: "b&a" },
			b: { a: "a&b" }
		})
		attest($.infer).types.toString.snap(
			"{ a: { b: { a: { b: any; a: any; }; b: any; }; }; b: { a: { b: { a: any; b: any; }; a: any; }; }; }"
		)
	})
	// TODO: reenable
	// test("cyclic", () => {
	//     const types = scope({ a: { b: "b" }, b: { a: "a" } }).export()
	//     // attest(types.a.node).snap({
	//     //     object: { props: { b: "b" } }
	//     // })
	//     // Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
	//     attest(types.a.infer).typed as {
	//         b: {
	//             a: {
	//                 b: {
	//                     a: any
	//                 }
	//             }
	//         }
	//     }
	//     attest(types.b.infer.a.b.a.b.a.b.a).typed as {
	//         b: {
	//             a: any
	//         }
	//     }
	//     // @ts-expect-error
	//     attest(types.a.infer.b.a.b.c).types.errors.snap(
	//         `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
	//     )
	// })
	// test("allows valid", () => {
	//     const types = getCyclicScope().export()
	//     const data = getCyclicData()
	//     attest(types.package(data).data).snap({
	//         name: "arktype",
	//         dependencies: [{ name: "typescript" }, "(cycle)" as any as Package],
	//         contributors: [{ email: "david@arktype.io" }]
	//     })
	// })
	// test("adds problems on invalid", () => {
	//     const types = getCyclicScope().export()
	//     const data = getCyclicData()
	//     data.contributors[0].email = "ssalbdivad"
	//     attest(types.package(data).problems?.summary).snap(
	//         "dependencies/1/contributors/0/email must be a valid email (was 'ssalbdivad')\ncontributors/0/email must be a valid email (was 'ssalbdivad')"
	//     )
	// })
	// test("can include cyclic data in message", () => {
	//     const data = getCyclicData()
	//     const nonSelfDependent = getCyclicScope().type([
	//         "package",
	//         ":",
	//         (p) => !p.dependencies?.some((d) => d.name === p.name)
	//     ])
	//     attest(nonSelfDependent(data).problems?.summary).snap(
	//         'Must be valid (was {"name":"arktype","dependencies":[{"name":"typescript"},"(cycle)"],"contributors":[{"email":"david@arktype.io"}]})'
	//     )
	// })
	test("union cyclic reference", () => {
		const types = scope({
			a: {
				b: "b"
			},
			b: {
				a: "a|3"
			}
		})
		attest(types.infer).types.toString.snap(
			"{ a: { b: { a: 3 | any; }; }; b: { a: 3 | { b: any; }; }; }"
		)
	})
	test("intersect cyclic reference", () => {
		const types = scope({
			a: {
				b: "b"
			},
			b: {
				c: "a&b"
			}
		})
		attest(types.infer).types.toString.snap(
			"{ a: { b: { c: { b: any; c: any; }; }; }; b: { c: { b: any; c: any; }; }; }"
		)
	})
})
