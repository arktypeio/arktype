import { attest, contextualize } from "@ark/attest"
import { $ark } from "@ark/schema"
import { register } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	const registeredIdCount = () => Object.keys($ark.nodesById).length

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
			"box.box must be an object or undefined (was a number)"
		)
	})

	it("prints bare names", () => {
		register(Symbol("bareTag"))
		register({ isBare: () => true }.isBare)
		const bareTag = Symbol("bareTag")
		const isBare = (s: string) => s === "bare"

		const Unit = type.unit(bareTag)
		attest(Unit.expression).snap("Symbol(bareTag)")
		attest(Unit(5).toString()).snap("must be Symbol(bareTag) (was 5)")

		const Keyed = type({ [bareTag]: "string" })
		attest(Keyed.expression).snap("{ Symbol(bareTag): string }")
		attest(Keyed({ [bareTag]: 5 }).toString()).snap(
			"value at [Symbol(bareTag)] must be a string (was a number)"
		)

		attest(() => type("'a'").narrow(isBare)).throws(
			'Intersection of "a" and isBare results in an unsatisfiable type'
		)
	})

	it("orders by bare names", () => {
		for (let i = 0; i < 3; i++) register({ check: () => true }.check)
		const check = (n: number) => n > 0
		const check2 = (n: number) => n % 2 === 0

		const T = type("number").narrow(check2).or(type("number").narrow(check))
		attest(T(-3).toString()).snap(
			"must be valid according to check or valid according to check2 (was -3)"
		)
	})

	it("symbols that print alike keep separate errors", () => {
		const l = Symbol("alike")
		const r = Symbol("alike")
		const T = type({
			[l]: "number",
			[r]: type("string").pipe((s, ctx) => ctx.error("bad"))
		})

		attest(T({ [l]: "x", [r]: "y" }).toString())
			.snap(`value at [Symbol(alike)] must be a number (was a string)
value at [Symbol(alike)] must be bad (was "y")`)
	})
})
