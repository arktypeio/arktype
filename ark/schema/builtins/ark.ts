import { ScopeNode } from "../scope.js"
import type { TypeKind } from "../shared/define.js"
import type { inferred } from "../shared/symbols.js"
import { JsObjects } from "./jsObjects.js"
import { TsKeywords } from "./tsKeywords.js"
import { Validation } from "./validation.js"

export const builtin: ScopeNode<ArkResolutions> = ScopeNode.from({
	...TsKeywords.keywords,
	...JsObjects.keywords,
	...Validation.keywords
}) as never

export const keywords = builtin.keywords

export const schema = builtin.schema

export namespace schema {
	export type cast<to, kind extends TypeKind = TypeKind> = {
		[inferred]?: to
		kind?: kind
	}
}

export type isSchemaCast<def> = typeof inferred | "kind" extends keyof def
	? true
	: false

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface ArkResolutions
	extends TsKeywords.resolutions,
		JsObjects.resolutions,
		Validation.resolutions {}
