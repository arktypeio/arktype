import { AssertionError } from "node:assert"
import { attest } from "@arktype/attest"
import { ArkTypeError } from "@arktype/schema"
import { define, scope, type } from "arktype"

import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.ts"

describe("type methods", () => {
	it("root discriminates", () => {
		const t = type("string")
		const { data, problems } = t("")
		if (problems) {
			problems.throw()
		} else {
			attest<string>(data)
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
	it("problems can be thrown", () => {
		const t = type("number")
		try {
			attest(t("invalid").problems?.throw())
		} catch (e) {
			attest(e instanceof ArkTypeError).equals(true)
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
