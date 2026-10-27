import {
	configureSchema,
	intrinsic,
	rootSchema,
	schemaScope
} from "@ark/schema"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

configureSchema({ domain: { description: () => "a configured domain" } })
rootSchema({ domain: "number" })

const { type } = await import("arktype")

cases({
	intrinsicsParsedWithTheEngine: () => {
		strictEqual(
			String(type("object.json")({ a: 1n })),
			"a must be a number, a string, an object, boolean or null (was a bigint)"
		)
		strictEqual(intrinsic.jsonPrimitive.is("union"), true)
		strictEqual(
			intrinsic.jsonData.assertIs("union").discriminant !== null,
			true
		)
	},
	intrinsicsParsedWithTheGlobalConfig: () => {
		strictEqual(
			intrinsic.number.traverse("x")?.toString(),
			"must be a configured domain (was a string)"
		)
		strictEqual(intrinsic.string.description, "a configured domain")
		strictEqual(
			schemaScope({}).schema("symbol").traverse("x")?.toString(),
			"must be a configured domain (was a string)"
		)
	}
})
