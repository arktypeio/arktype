import { rootNode } from "@ark/schema"
import type { string } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
import { scope } from "../../scope.ts"
import { regexStringNode } from "./regex.ts"

// Based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const submodule = scope(
	{
		$root: "versioned | nil | max",
		"#versioned": regexStringNode(
			/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
			"a versioned UUID"
		),
		v1: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv1"
		),
		v2: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-2[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv2"
		),
		v3: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv3"
		),
		v4: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv4"
		),
		v5: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv5"
		),
		v6: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv6"
		),
		v7: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv7"
		),
		v8: regexStringNode(
			/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			"a UUIDv8"
		),
		nil: rootNode({
			unit: "00000000-0000-0000-0000-000000000000",
			meta: "the nil UUID"
		}),
		max: rootNode({
			unit: "ffffffff-ffff-ffff-ffff-ffffffffffff",
			meta: "the max UUID"
		})
	},
	{ prereducedAliases: true }
).export()

export const arkUuid = {
	submodule
}

export declare namespace arkUuid {
	export type submodule = Submodule<{
		$root: string.matching<"?">
		v1: string.matching<"?">
		v2: string.matching<"?">
		v3: string.matching<"?">
		v4: string.matching<"?">
		v5: string.matching<"?">
		v6: string.matching<"?">
		v7: string.matching<"?">
		v8: string.matching<"?">
		nil: string.matching<"?">
		max: string.matching<"?">
	}>
}
