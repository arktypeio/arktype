import { attest } from "@arktype/attest"
import { ArkError, type } from "arktype"
import { AssertionError } from "node:assert"

it("root discriminates", () => {
	const t = type("string")
	const { out, errors: errors } = t("")
	if (errors) {
		errors.throw()
	} else {
		attest<string>(out)
	}
})

it("allows", () => {
	const t = type("number%2")
	const data: unknown = 4
	if (t.allows(data)) {
		// narrows correctly
		attest<number>(data)
	} else {
		throw new Error()
	}
	attest(t.allows(5)).equals(false)
})

it("errors can be thrown", () => {
	const t = type("number")
	try {
		attest(t("invalid").errors?.throw())
	} catch (e) {
		attest(e instanceof ArkError).equals(true)
		return
	}
	throw new AssertionError({ message: "Expected to throw" })
})
