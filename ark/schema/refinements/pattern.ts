import { appendUnique } from "@arktype/util"
import type { BaseMeta, FoldInput, declareNode } from "../shared/declare.js"
import { BaseRefinement } from "./refinement.js"

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
	intersections: {
		pattern: "pattern" | null
	}
	open: true
	prerequisite: string
	primitive: true
}>

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
		primitive: (node) => {
			const compiledCondition = `/${node.source}/${node.flags ?? ""}.test(${
				node.$.dataArg
			})`
			return {
				compiledCondition,
				compiledNegation: `!${compiledCondition}`
			}
		}
	})

	readonly constraintGroup = "shallow"
	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test

	get prerequisiteSchemas() {
		return ["string"] as const
	}

	intersectOwnInner(r: PatternNode) {
		// For now, non-equal regex are naively intersected
		return null
	}

	foldIntersection(into: FoldInput<"pattern">) {
		into.pattern = appendUnique(into.pattern, this)
		return into
	}
}
