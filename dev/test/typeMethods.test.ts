import { AssertionError } from "node:assert"
import { attest } from "@arktype/attest"
import { define, scope, type, Type } from "arktype"
import { suite, test } from "mocha"
import { ArkTypeError } from "../../src/compiler/problems.js"
import { writeUnresolvableMessage } from "../../src/parser/string/shift/operand/unenclosed.js"

suite("type methods", () => {
	test("root discriminates", () => {
		const t = type("string")
		const { data, problems } = t("")
		if (problems) {
			problems.throw()
		} else {
			attest(data).typed as string
		}
	})
	test("allows", () => {
		const t = type("number%2")
		const data: unknown = 4
		if (t.allows(data)) {
			// narrows correctly
			attest(data).typed as number
		} else {
			throw new Error()
		}
		attest(t.allows(5)).equals(false)
	})
	test("problems can be thrown", () => {
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

suite("scope utilities", () => {
	suite("define", () => {
		test("ark", () => {
			const def = define({
				a: "string|number",
				b: ["boolean"],
				c: "this"
			})
			attest(def).typed as {
				a: "string|number"
				b: ["boolean"]
				c: "this"
			}
		})
		test("ark error", () => {
			// currently is a no-op, so only has type error
			// @ts-expect-error
			attest(define({ a: "boolean|foo" })).types.errors(
				writeUnresolvableMessage("foo")
			)
		})
		test("custom scope", () => {
			const $ = scope({
				a: "string[]"
			})
			const ok = $.define(["a[]|boolean"])
			attest(ok).typed as ["a[]|boolean"]
			// @ts-expect-error
			attest($.define({ not: "ok" })).types.errors(
				writeUnresolvableMessage("ok")
			)
		})
	})
})
