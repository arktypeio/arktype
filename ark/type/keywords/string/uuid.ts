import type { Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import type { string } from "./string.ts"
import { regexStringNode } from "./utils.ts"

// Based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
export const uuid = submodule({
	// the meta tuple expression ensures the error message does not delegate
	// to the individual branches, which are too detailed
	$root: ["versioned | nil | max", "@", "a UUID"],
	"#nil": "'00000000-0000-0000-0000-000000000000'",
	"#max": "'ffffffff-ffff-ffff-ffff-ffffffffffff'",
	"#versioned":
		/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
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
	)
})

export type uuid = Submodule<{
	$root: string.narrowed
	v1: string.narrowed
	v2: string.narrowed
	v3: string.narrowed
	v4: string.narrowed
	v5: string.narrowed
	v6: string.narrowed
	v7: string.narrowed
	v8: string.narrowed
	nil: string.narrowed
	max: string.narrowed
}>