import { node, type Intersection } from "@ark/schema"
import { throwParseError } from "@ark/util"
import type { JsonSchema, Out, Type } from "arktype"
import {
	writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage,
	writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage
} from "./errors.ts"
import { JsonSchemaScope } from "./scope.ts"

export const parseNumberJsonSchema: Type<
	(In: JsonSchema.Numeric) => Out<Type<number, any>>,
	any
> = JsonSchemaScope.NumberSchema.pipe((jsonSchema): Type<number> => {
	const arktypeNumberSchema: Intersection.Inner = {
		domain: node("domain", { domain: "number" })
	}

	if ("maximum" in jsonSchema) {
		if ("exclusiveMaximum" in jsonSchema)
			throwParseError(writeJsonSchemaNumberMaximumAndExclusiveMaximumMessage())

		arktypeNumberSchema.max = node("max", { rule: jsonSchema.maximum })
	} else if ("exclusiveMaximum" in jsonSchema) {
		arktypeNumberSchema.max = node("max", {
			rule: jsonSchema.exclusiveMaximum,
			exclusive: true
		})
	}

	if ("minimum" in jsonSchema) {
		if ("exclusiveMinimum" in jsonSchema)
			throwParseError(writeJsonSchemaNumberMinimumAndExclusiveMinimumMessage())

		arktypeNumberSchema.min = node("min", { rule: jsonSchema.minimum })
	} else if ("exclusiveMinimum" in jsonSchema) {
		arktypeNumberSchema.min = node("min", {
			rule: jsonSchema.exclusiveMinimum,
			exclusive: true
		})
	}

	if ("multipleOf" in jsonSchema) {
		arktypeNumberSchema.divisor = node("divisor", {
			rule: jsonSchema.multipleOf
		})
	} else if (jsonSchema.type === "integer")
		arktypeNumberSchema.divisor = node("divisor", { rule: 1 })

	// an unconstrained number is its domain
	return (
		Object.keys(arktypeNumberSchema).length === 1 ?
			arktypeNumberSchema.domain
		:	node("intersection", arktypeNumberSchema)) as never
})
