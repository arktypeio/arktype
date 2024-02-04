import { throwParseError } from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { PrimitiveAttachmentsInput } from "../shared/implement.js"
import { BaseRefinement, type FoldInput } from "./refinement.js"

export interface KeysInner extends BaseMeta {
	readonly keys: number
}

export type NormalizedKeysSchema = KeysInner

export type KeysSchema = NormalizedKeysSchema | number

export type KeysDeclaration = declareNode<{
	kind: "keys"
	schema: KeysSchema
	normalizedSchema: NormalizedKeysSchema
	inner: KeysInner
	composition: "primitive"
	prerequisite: number
	attachments: PrimitiveAttachmentsInput
}>

export class KeysNode extends BaseRefinement<KeysDeclaration, typeof KeysNode> {
	static implementation = this.implement({
		collapseKey: "keys",
		keys: {
			keys: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { keys: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.keys === 1 ? "an integer" : `a multiple of ${inner.keys}`
			}
		},
		attachments: (base) => ({
			primitive: true,
			compiledCondition: `${base.$.dataArg} % ${base.keys} === 0`,
			compiledNegation: `${base.$.dataArg} % ${base.keys} !== 0`
		})
	})

	readonly constraintGroup = "props"
	readonly hasOpenIntersection = false
	traverseAllows = (data: number) => data % this.keys === 0

	intersectOwnInner(r: KeysNode) {
		return {
			keys: Math.abs(
				(this.keys * r.keys) / greatestCommonKeys(this.keys, r.keys)
			)
		}
	}

	foldIntersection(into: FoldInput<"keys">) {
		if (into.basis?.domain !== "number") {
			throwParseError("")
		}
		into.keys = this.intersectOwnKind(into.keys)
		return into
	}
}

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonKeys = (l: number, r: number) => {
	let previous: number
	let greatestCommonKeys = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonKeys % current
		greatestCommonKeys = previous
	}
	return greatestCommonKeys
}
