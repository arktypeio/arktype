import { configureAfterTypeMessage, rootSchema, schemaScope } from "@ark/schema"
import { configure, scope, type } from "arktype"
import { strictEqual, throws } from "node:assert/strict"
import { cases } from "./util.ts"

configure({
	numberAllowsInfinity: true,
	dateAllowsInvalid: true,
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
		strictEqual(type("string.numeric.parse")("1e400"), Number.POSITIVE_INFINITY)
		strictEqual(
			(type("string.json.parse")("[1e400]") as number[])[0],
			Number.POSITIVE_INFINITY
		)
	},
	dateAllowsInvalid: () => {
		strictEqual(type("Date").allows(new Date("!")), true)
		strictEqual(schemaScope({ d: Date }).export().d.allows(new Date("!")), true)
	},
	keywords: () => {
		strictEqual(type("string.email").description, "a configured email")
		strictEqual(type.keywords.string.email.description, "a configured email")
	},
	configureAfterType: () => {
		throws(() => configure({ numberAllowsInfinity: false }), {
			message: configureAfterTypeMessage
		})
		throws(() => configure({ onFail: () => {} }), {
			message: configureAfterTypeMessage
		})
	},
	reconfigureUnchanged: () => {
		// as when a test runner resets its modules and the config file runs again
		configure({
			numberAllowsInfinity: true,
			dateAllowsInvalid: true,
			keywords: {
				"string.email": "a configured email"
			}
		})
		configure({})
		strictEqual(type("number").allows(Number.POSITIVE_INFINITY), true)
	}
})
