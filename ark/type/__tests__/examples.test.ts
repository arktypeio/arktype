import { attest } from "@arktype/attest"

describe("snippets", () => {
	// it("demo", async () => {
	// 	const typeSnippet = await import("../../docs/examples/demo.js")
	// 	attest<{>(typeSnippet.pkg.infer)
	// 		name: string
	// 		version: string
	// 		contributors?: string[]
	// 	}
	// 	attest(typeSnippet.problems?.summary).snap(
	// 		"contributors must be more than 1 items long (was 1)"
	// 	)
	// })
	// it("type", async () => {
	// 	const typeSnippet = await import("./benches/type.js")
	// 	attest<{>(typeSnippet.user.infer)
	// 		name: string
	// 		device: {
	// 			platform: "android" | "ios"
	// 			version?: number
	// 		}
	// 	}
	// 	attest(typeSnippet.problems?.summary).snap(
	// 		"device/platform must be 'android' or 'ios' (was 'enigma')"
	// 	)
	// })
	// // it("scope", async () => {
	// //     const scopeSnippet = await import("../examples/scope.js")
	// //     attest<{>(scopeSnippet.types.package.infer)
	// //         name: string
	// //         dependencies?: any[]
	// //         devDependencies?: any[]
	// //         contributors?: {
	// //             email: string
	// //             packages?: any[]
	// //         }[]
	// //     }
	// //     attest(scopeSnippet.problems?.summary).snap(
	// //         "dependencies/0/dependencies/0/contributors/0/email must be a valid email (was 'david@sharktypeio')\ncontributors/0/email must be a valid email (was 'david@sharktypeio')"
	// //     )
	// // })
	// it("optimized", async () => {
	// 	const example = await import("../../docs/examples/optimized.js")
	// 	attest(example.deepLeftOrRight.infer).typed as
	// 		| {
	// 				auto: {
	// 					discriminated: "left"
	// 				}
	// 		  }
	// 		| {
	// 				auto: {
	// 					discriminated: "right"
	// 				}
	// 		  }
	// 	attest<number>(example.numericIntersection.infer)
	// })
})
