import { attest, contextualize } from "@ark/attest"
import { $ark } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	const registeredIdCount = () => Object.keys($ark.nodesByRegisteredId).length

	const assertNoRegistryGrowth = (instantiate: () => unknown) => {
		// warm any caches
		instantiate()
		const initialCount = registeredIdCount()
		for (let i = 0; i < 100; i++) instantiate()
		attest(registeredIdCount()).equals(initialCount)
	}

	const T = type({ a: "string", b: "number" })
	const U = type({ c: "boolean" })

	it("keyword", () => {
		assertNoRegistryGrowth(() => type("string"))
	})

	it("expression", () => {
		assertNoRegistryGrowth(() => type("string[] | number"))
	})

	it("object literal", () => {
		assertNoRegistryGrowth(() => type({ a: "string", "b?": "number[]" }))
	})

	it("validation", () => {
		assertNoRegistryGrowth(() => type({ a: "string" })({ a: "foo" }))
	})

	it("pick", () => {
		assertNoRegistryGrowth(() => T.pick("a"))
	})

	it("and", () => {
		assertNoRegistryGrowth(() => T.and(U))
	})

	it("or", () => {
		assertNoRegistryGrowth(() => T.or(U))
	})

	it("array", () => {
		assertNoRegistryGrowth(() => T.array())
	})

	it("cyclic types still resolve", () => {
		const Box = type({ box: "this | undefined" })
		attest(Box({ box: { box: undefined } })).snap({ box: { box: undefined } })
		attest(Box({ box: { box: 5 } }).toString()).snap(
			'box.box must be an object or undefined (was 5) or box must be undefined (was {"box":5})'
		)
	})
})
