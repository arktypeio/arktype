import { configureSchema, intrinsic, rootSchema } from "@ark/schema"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

// once imported, @ark/schema is configured, then parses, which parses the
// intrinsics, all before arktype, and so arksets, is imported
configureSchema({ domain: { description: () => "a configured domain" } })
rootSchema({ domain: "number" })

const { type } = await import("arktype")

cases({
	intrinsicsParsedWithTheEngine: () => {
		strictEqual(
			String(type("object.json")({ a: 1n })),
			"a must be an object (was a bigint)"
		)
		strictEqual(intrinsic.jsonPrimitive.hasKind("union"), true)
		strictEqual(
			intrinsic.jsonData.assertHasKind("union").discriminant !== null,
			true
		)
	},
	intrinsicsParsedWithTheConfigAsOfImport: () => {
		strictEqual(
			intrinsic.number.traverse("x")?.toString(),
			"must be a number (was a string)"
		)
		strictEqual(intrinsic.string.description, "a string")
	}
})
