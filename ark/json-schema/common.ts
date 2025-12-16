import { throwParseError } from "@ark/util"
import { type JsonSchema, type Type, type } from "arktype"
import { writeJsonSchemaCommonConstAndEnumMessage } from "./errors.ts"

export const parseCommonJsonSchema = (
	jsonSchema: JsonSchema
): Type | undefined => {
	if ("const" in jsonSchema) {
		if ("enum" in jsonSchema)
			throwParseError(writeJsonSchemaCommonConstAndEnumMessage())

		return type.unit(jsonSchema.const)
	}

	if ("enum" in jsonSchema) return type.enumerated(...jsonSchema.enum)
}
