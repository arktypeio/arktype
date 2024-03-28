import type { TypeKind } from "../shared/implement.js"
import type { inferred } from "../shared/inference.js"
import { space } from "../space.js"
import { jsObjects } from "./jsObjects.js"
import { tsKeywords } from "./tsKeywords.js"
import { validation } from "./validation.js"

export const keywords: ArkResolutions = space(
	{
		...tsKeywords,
		...jsObjects,
		...validation
	},
	{ prereducedAliases: true }
) as never

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
export interface ArkResolutions extends tsKeywords, jsObjects, validation {}
