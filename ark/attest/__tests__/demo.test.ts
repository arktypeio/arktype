import { attest } from "@arktype/attest"

const o = { ark: "type" } as const
const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}

it("value snap", () => {
	attest(o).snap({ ark: "type" })
})

it("type snap", () => {
	attest(o).type.toString.snap('{ readonly ark: "type"; }')
})

it("type assertion", () => {
	attest<{ readonly ark: "type" }>(o)
})

it("type-only assertion", () => {
	attest<{ readonly ark: "type" }, typeof o>()
})

it("chained snaps", () => {
	attest(o)
		.snap({ ark: "type" })
		.type.toString.snap('{ readonly ark: "type"; }')
})

it("error and type error snap", () => {
	// @ts-expect-error
	attest(() => shouldThrow(true))
		.throws.snap("Error: true is not assignable to false")
		.type.errors.snap(
			"Argument of type 'true' is not assignable to parameter of type 'false'."
		)
})
