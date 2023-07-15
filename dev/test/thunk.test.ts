import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeBadDefinitionTypeMessage } from "../../src/parser/definition.js"
import { writeUnresolvableMessage } from "../../src/parser/string/shift/operand/unenclosed.js"

suite("thunk", () => {
	test("thunk", () => {
		const t = type(() => type("boolean"))
		attest(t.infer).typed as boolean
		attest(() => {
			// @ts-expect-error
			type(() => type("moolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
	})
	test("thunks in scope", () => {
		const $ = scope({
			a: () => $.type({ b: "b" }),
			b: () => $.type({ a: "string" })
		})
		attest($.infer).typed as {
			a: {
				b: {
					a: string
				}
			}
			b: {
				a: string
			}
		}
		const types = $.export()
		attest(types.a.infer).typed as {
			b: {
				a: string
			}
		}
		// attest(types.a.node).snap({ object: { props: { b: "b" } } })
		attest(types.b.infer).typed as {
			a: string
		}
		// attest(types.b.node).snap({
		//     object: { props: { a: { object: { props: { a: "string" } } } } }
		// })
	})
	test("expression from thunk", () => {
		const $ = scope({
			a: () => $.type({ a: "string" }),
			b: { b: "boolean" },
			aAndB: () => $.type("a&b")
		})
		const types = $.export()
		attest(types.aAndB.infer).typed as {
			a: string
			b: boolean
		}
		// attest(types.aAndB.node).snap({
		//     object: { props: { a: "string", b: "boolean" } }
		// })
	})
	test("shallow thunk in type", () => {
		const t = type(() => type("string"))
		attest(t.condition).equals(type("string").condition)
		attest(t.infer).typed as string
	})
	test("deep thunk in type", () => {
		const t = type({ a: () => type("string") })
		attest(t.condition).equals(type({ a: "string" }).condition)
		attest(t.infer).typed as string
	})
	test("non-type thunk in scope", () => {
		const $ = scope({
			a: () => 42
		})
		attest(() => $.export()).throws(writeBadDefinitionTypeMessage("number"))
	})
	test("parse error in thunk in scope", () => {
		const $ = scope({
			// @ts-expect-error
			a: () => $.type("bad")
		})
		attest(() => $.export()).throws(writeUnresolvableMessage("bad"))
	})
})
