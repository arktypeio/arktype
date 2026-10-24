import { isArray } from "@ark/util"
import { parse } from "arksets"
import { type, type Type } from "arktype"
import type { inferJsonSchema } from "./infer.ts"
import type { validateJsonSchema } from "./validate.ts"

export const jsonSchemaToType: <
	const schema,
	r = Type<inferJsonSchema<schema>>
>(
	schema: validateJsonSchema<schema>
) => r extends infer _ ? _ : never = schema =>
	type(
		parse(isArray(schema) ? { anyOf: schema } : (schema as never)) as never
	) as never
