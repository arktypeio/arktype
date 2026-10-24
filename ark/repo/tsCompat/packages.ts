// the packages beside arktype, whose declarations index.ts doesn't load
import { jsonSchemaToType } from "@ark/json-schema"
import { precompile } from "@ark/aot/unplugin"
import { isSubset } from "arksets"
import { type } from "arktype"
import * as runtime from "arktype/runtime"

type equals<l, r> =
	(<t>() => t extends l ? 1 : 0) extends <t>() => t extends r ? 1 : 0 ? true
	:	false

const assertEquals = <l, r>(
	..._: equals<l, r> extends true ? [] : [never]
) => {}

export const FromJsonSchema = jsonSchemaToType({
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "integer", minimum: 0 }
	},
	required: ["name"]
})

assertEquals<typeof FromJsonSchema.infer, { name: string; age?: number }>()

export const subset: boolean = isSubset(
	type({ a: "string" }),
	type({ a: "string | number" })
)

export const plugin = precompile.vite()

export { runtime }
