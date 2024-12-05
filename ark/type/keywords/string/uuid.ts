import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

// Based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
export const uuid = arkModule({
	// the meta tuple expression ensures the error message does not delegate
	// to the individual branches, which are too detailed
	root: ["versioned | nil | max", "@", "a UUID"],
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

export declare namespace uuid {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		v1: string
		v2: string
		v3: string
		v4: string
		v5: string
		v6: string
		v7: string
		v8: string
	}
}
