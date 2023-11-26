import { ScopeNode } from "../scope.js"
import type { SchemaKind } from "../shared/define.js"
import type { inferred } from "../shared/symbols.js"
import { JsObjects } from "./jsObjects.js"
import { TsKeywords } from "./tsKeywords.js"
import { Validation } from "./validation.js"

export const ark: ScopeNode<ArkResolutions> = ScopeNode.from({
	...TsKeywords.resolutions,
	...JsObjects.resolutions,
	...Validation.resolutions
}) as never

export const schema = ark.schema

export namespace schema {
	export type cast<to, kind extends SchemaKind = SchemaKind> = {
		[inferred]?: to
		kind?: kind
	}
}

export type isCast<def> = typeof inferred | "kind" extends keyof def
	? true
	: false

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface ArkResolutions
	extends TsKeywords.resolutions,
		JsObjects.resolutions,
		Validation.resolutions {}
