import { attest } from "@arktype/attest"
import { test } from "mocha"

const o = { ark: "type" } as const
const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}

test("value snap", () => {
	attest(o).snap()
})

test("type snap", () => {
	attest(o).types.toString.snap()
})

test("chained snaps", () => {
	attest(o).snap().types.toString.snap()
})

test("error and type error snap", () => {
	// @ts-expect-error
	attest(() => shouldThrow(true))
		.throws.snap()
		.types.errors.snap()
})
