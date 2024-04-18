// import { attest, contextualize } from "@arktype/attest"
// import { writeUnresolvableMessage } from "@arktype/schema"
// import { scope, type } from "arktype"

// contextualize(() => {
// 	it("resolves from type", () => {
// 		const disappointingGift = type({
// 			label: "string",
// 			"box?": "this"
// 		})

// 		type ExpectedDisappointingGift = {
// 			label: string
// 			box?: ExpectedDisappointingGift
// 		}
// 		attest<ExpectedDisappointingGift>(disappointingGift.infer)
// 	})

// 	it("doesn't change when rereferenced", () => {
// 		const initial = type({
// 			initial: "this"
// 		})

// 		const reference = type({
// 			reference: initial
// 		})
// 		type Initial = {
// 			initial: Initial
// 		}
// 		type Expected = {
// 			reference: Initial
// 		}

// 		attest<Expected>(reference.infer)
// 		const types = scope({
// 			initial: {
// 				initial: "initial"
// 			},
// 			reference: {
// 				reference: "initial"
// 			}
// 		}).export()
// 		attest(reference.json).equals(types.reference.json)
// 	})

// 	it("unresolvable in scope", () => {
// 		attest(() =>
// 			scope({
// 				disappointingGift: {
// 					label: "string",
// 					// @ts-expect-error
// 					"box?": "this"
// 				}
// 			}).export()
// 		).throwsAndHasTypeError(writeUnresolvableMessage("this"))
// 	})

// 	it("root expression", () => {
// 		const t = type({ a: "string" }, "|", { b: "this" })
// 		attest(t.infer).type.toString.snap(
// 			"{ a: string; } | { b: { a: string; } | any; }"
// 		)
// 		attest(t.json).equals(type([{ a: "string" }, "|", { b: "this" }]).json)
// 	})

// 	// TODO: reenable
// 	it("tuple expression", () => {
// 		const t = type([{ a: "string" }, "|", { b: "this" }])
// 		attest(t.infer).type.toString.snap(
// 			"{ a: string; } | { b: { a: string; } | any; }"
// 		)
// 		const types = scope({
// 			a: {
// 				a: "string"
// 			},
// 			b: {
// 				b: "expected"
// 			},
// 			expected: "a|b"
// 		}).export()
// 		attest(t.json).equals(types.expected.json)
// 	})
// })
