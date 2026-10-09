import { constraintInputOf, node, type Intersection } from "@ark/schema"
import type { Out, Type } from "arktype"
import { JsonSchemaScope, type StringSchema } from "./scope.ts"

export const parseStringJsonSchema: Type<
	(In: StringSchema) => Out<Type<string, any>>,
	any
> = JsonSchemaScope.StringSchema.pipe((jsonSchema): Type<string> => {
	const arktypeStringSchema: Intersection.Inner = {
		domain: node("domain", { domain: "string" })
	}

	if ("maxLength" in jsonSchema) {
		arktypeStringSchema.maxLength = node("maxLength", {
			rule: jsonSchema.maxLength
		}) as never
	}
	if ("minLength" in jsonSchema) {
		const minLength = node("minLength", { rule: jsonSchema.minLength })
		// a minimum length of 0 reduces to unknown
		if (minLength.hasKind("minLength"))
			arktypeStringSchema.minLength = minLength
	}
	if ("pattern" in jsonSchema) {
		arktypeStringSchema.pattern = [
			node("pattern", constraintInputOf("pattern", jsonSchema.pattern))
		]
	}

	// an unconstrained string is its domain
	return (
		Object.keys(arktypeStringSchema).length === 1 ?
			arktypeStringSchema.domain
		:	node("intersection", arktypeStringSchema)) as never
})
