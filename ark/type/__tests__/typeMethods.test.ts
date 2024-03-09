import { attest } from "@arktype/attest"
import { ArkError, define, scope, type } from "arktype"
import { AssertionError } from "node:assert"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

describe("type methods", () => {
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
})

describe("scope utilities", () => {
	describe("define", () => {
		it("ark", () => {
			const def = define({
				a: "string|number",
				b: ["boolean"],
				c: "this"
			})
			attest<{ a: "string|number"; b: ["boolean"]; c: "this" }>(def)
		})
		it("ark error", () => {
			// currently is a no-op, so only has type error
			// @ts-expect-error
			attest(define({ a: "boolean|foo" })).type.errors(
				writeUnresolvableMessage("foo")
			)
		})
		it("custom scope", () => {
			const $ = scope({
				a: "string[]"
			})
			const ok = $.define(["a[]|boolean"])
			attest<["a[]|boolean"]>(ok)
			// @ts-expect-error
			attest($.define({ not: "ok" })).type.errors(
				writeUnresolvableMessage("ok")
			)
		})
	})
})
