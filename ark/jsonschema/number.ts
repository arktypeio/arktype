import { rootSchema, type Intersection } from "@ark/schema"
import { throwParseError } from "@ark/util"
import type { Type, number } from "arktype"
import { JsonSchema } from "./scope.js"

export const validateJsonSchemaNumber = JsonSchema.NumberSchema.pipe(
	(jsonSchema): Type<number> => {
		const arktypeNumberSchema: Intersection.Schema<number> = {
			domain: "number"
		}

		if ("maximum" in jsonSchema) {
			if ("exclusiveMaximum" in jsonSchema) {
				throwParseError(
					"Provided number JSON Schema cannot have 'maximum' and 'exclusiveMaximum"
				)
			}
			arktypeNumberSchema.max = jsonSchema.maximum
		} else if ("exclusiveMaximum" in jsonSchema) {
			arktypeNumberSchema.max = {
				rule: jsonSchema.exclusiveMaximum,
				exclusive: true
			}
		}

		if ("minimum" in jsonSchema) {
			if ("exclusiveMinimum" in jsonSchema) {
				throwParseError(
					"Provided number JSON Schema cannot have 'minimum' and 'exclusiveMinimum"
				)
			}
			arktypeNumberSchema.min = jsonSchema.minimum
		} else if ("exclusiveMinimum" in jsonSchema) {
			arktypeNumberSchema.min = {
				rule: jsonSchema.exclusiveMinimum,
				exclusive: true
			}
		}

		if ("multipleOf" in jsonSchema)
			arktypeNumberSchema.divisor = jsonSchema.multipleOf
		else if (jsonSchema.type === "integer") arktypeNumberSchema.divisor = 1

		return rootSchema(arktypeNumberSchema) as never
	}
)

export type inferJsonSchemaNumber<numberSchema, T = number> =
	"exclusiveMaximum" extends keyof numberSchema ?
		inferJsonSchemaNumber<
			Omit<numberSchema, "exclusiveMaximum">,
			T & number.lessThan<numberSchema["exclusiveMaximum"]>
		>
	: "exclusiveMinimum" extends keyof numberSchema ?
		inferJsonSchemaNumber<
			Omit<numberSchema, "exclusiveMinimum">,
			T & number.moreThan<numberSchema["exclusiveMinimum"]>
		>
	: "maximum" extends keyof numberSchema ?
		inferJsonSchemaNumber<
			Omit<numberSchema, "maximum">,
			T & number.atMost<numberSchema["maximum"]>
		>
	: "minimum" extends keyof numberSchema ?
		inferJsonSchemaNumber<
			Omit<numberSchema, "minimum">,
			T & number.atLeast<numberSchema["minimum"]>
		>
	: "multipleOf" extends keyof numberSchema ?
		inferJsonSchemaNumber<
			Omit<numberSchema, "multipleOf" | "type"> & { type: "number" },
			T & number.divisibleBy<numberSchema["multipleOf"]>
		>
	: "type" extends keyof numberSchema ?
		numberSchema["type"] extends "integer" ?
			inferJsonSchemaNumber<
				Omit<numberSchema, "type"> & { type: "number" },
				T & number.divisibleBy<1>
			>
		:	T
	:	never // TODO: Throw type error (must have {type: "number"|"integer"} )
