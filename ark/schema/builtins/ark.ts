import { SchemaScope } from "../scope.js"
import { jsObjects, type JsObjectSchemas } from "./jsObjects.js"
import { tsKeywords, type TsKeywordSchemas } from "./tsKeywords.js"
import { validation, type InferredValidation } from "./validation.js"

export type ArkResolutions = Ark

export const ark: SchemaScope<ArkResolutions> = SchemaScope.from({
	...tsKeywords,
	...jsObjects,
	...validation
}) as never

export const schema = ark.schema

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends TsKeywordSchemas,
		JsObjectSchemas,
		InferredValidation {}
