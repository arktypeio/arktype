import { appendUnique, throwParseError } from "@arktype/util"
import { BaseNode } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { PrimitiveAttachmentsInput } from "../shared/implement.js"
import { BaseRefinement, getBasisName, type FoldInput } from "./refinement.js"

export interface PatternInner extends BaseMeta {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = PatternInner

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	normalizedSchema: NormalizedPatternSchema
	inner: PatternInner
	composition: "primitive"
	open: true
	prerequisite: string
	attachments: PrimitiveAttachmentsInput
}>

export const writeNonStringPatternMessage = <root extends string>(
	root: root
): writeNonStringPatternMessage<root> =>
	`Pattern operand ${root} must be a string`

export type writeNonStringPatternMessage<root extends string> =
	`Pattern operand ${root} must be a string`

export class PatternNode extends BaseRefinement<
	PatternDeclaration,
	typeof PatternNode
> {
	static implementation = this.implement({
		collapseKey: "source",
		keys: {
			source: {},
			flags: {}
		},
		normalize: (schema) =>
			typeof schema === "string"
				? { source: schema }
				: schema instanceof RegExp
				? schema.flags
					? { source: schema.source, flags: schema.flags }
					: { source: schema.source }
				: schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return `matched by ${inner.source}`
			}
		},
		attachments: (base) => {
			const compiledCondition = `/${base.source}/${base.flags ?? ""}.test(${
				base.$.dataArg
			})`
			return {
				primitive: true,
				compiledCondition,
				compiledNegation: `!${compiledCondition}`
			}
		}
	})

	readonly constraintGroup = "shallow"
	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test

	intersectOwnInner(r: PatternNode) {
		// For now, non-equal regex are naively intersected
		return null
	}

	foldIntersection(into: FoldInput<"pattern">) {
		if (into.basis?.domain !== "string") {
			throwParseError(writeNonStringPatternMessage(getBasisName(into.basis)))
		}
		into.pattern = appendUnique(into.pattern, this)
		return into
	}
}
