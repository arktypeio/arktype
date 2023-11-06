import { attest } from "@arktype/attest"
import { test } from "mocha"

const o = { ark: "type" } as const
const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}

test("value snap", () => {
	attest(o).snap({ ark: "type" })
})

test("type snap", () => {
	attest(o).type.toString.snap('{ readonly ark: "type"; }')
})

test("type assertion", () => {
	attest<{ readonly ark: "type" }>(o)
})

test("type-only assertion", () => {
	attest<{ readonly ark: "type" }, typeof o>()
})

test("chained snaps", () => {
	attest(o)
		.snap({ ark: "type" })
		.type.toString.snap('{ readonly ark: "type"; }')
})

test("error and type error snap", () => {
	// @ts-expect-error
	attest(() => shouldThrow(true))
		.throws.snap("Error: true is not assignable to false")
		.type.errors.snap(
			"Argument of type 'true' is not assignable to parameter of type 'false'."
		)
})
