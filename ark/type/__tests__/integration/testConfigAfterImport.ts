import { configureAfterTypeMessage, rootSchema, schemaScope } from "@ark/schema"
import { configure, scope, type } from "arktype"
import { deepStrictEqual, strictEqual, throws } from "node:assert/strict"
import { cases } from "./util.ts"

const early = scope({})

configure({
	numberAllowsInfinity: true,
	dateAllowsInvalid: true,
	rejectAllowsSymbolKeys: true,
	keywords: {
		"string.email": "a configured email"
	}
})

cases({
	numberAllowsInfinity: () => {
		for (const T of [
			type("number"),
			type.number,
			type.module({ n: "number" }).n,
			scope({ n: "number" }).export().n,
			schemaScope({ n: "number" }).export().n,
			rootSchema({ domain: "number" })
		]) {
			strictEqual(T.allows(Number.POSITIVE_INFINITY), true)
			strictEqual(T.allows(Number.NEGATIVE_INFINITY), true)
			strictEqual(T.allows(Number.NaN), false)
		}
	},
	dateAllowsInvalid: () => {
		strictEqual(type("Date").allows(new Date("!")), true)
		strictEqual(schemaScope({ d: Date }).export().d.allows(new Date("!")), true)
	},
	keywords: () => {
		strictEqual(type("string.email").description, "a configured email")
		strictEqual(type.keywords.string.email.description, "a configured email")
	},
	rejectAllowsSymbolKeys: () => {
		const undeclared = Symbol("undeclared")
		const data = { a: "ok", x: 1, [undeclared]: 1 }
		for (const $ of [early, scope({}, { jitless: true })]) {
			const T = $.type({ "+": "reject", a: "string", x: "number" })
			deepStrictEqual(T(data), data)
			const Indexed = $.type({
				"+": "reject",
				a: "string",
				"[/^x/]": "number"
			})
			deepStrictEqual(Indexed(data), data)
			strictEqual(Indexed({ ...data, b: 1 }).toString(), "b must be removed")
		}
		strictEqual(
			type({ "+": "reject", a: "string" }).and({ "[symbol]": "string" })
				.expression,
			"{ [symbol]: string, a: string, + (undeclared): reject }"
		)
	},
	configureAfterType: () => {
		throws(() => configure({}), { message: configureAfterTypeMessage })
	}
})
