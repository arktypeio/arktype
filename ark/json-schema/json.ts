import type { JsonSchemaOrBoolean } from "@ark/schema"
import { isArray } from "@ark/util"
import { parse } from "arksets"
import { type } from "arktype"
import type { StringSchema } from "./scope.ts"

export const jsonSchemaToType = (
	jsonSchema: JsonSchemaOrBoolean | StringSchema
): type<unknown> =>
	type(
		parse(isArray(jsonSchema) ? { anyOf: jsonSchema } : jsonSchema) as never
	) as never
