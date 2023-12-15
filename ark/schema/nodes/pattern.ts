import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeImplementation } from "../shared/define.js"
import type { OptionalNode } from "./optional.js"
import { BasePrimitiveRefinement } from "./refinement.js"

export type PatternInner = {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = withAttributes<PatternInner>

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	normalizedSchema: NormalizedPatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	prerequisite: string
}>

export class PatternNode extends BasePrimitiveRefinement<
	PatternDeclaration,
	typeof PatternNode
> {
	static implementation: NodeImplementation<PatternDeclaration> = {
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
		intersections: {
			// For now, non-equal regex are naively intersected
			pattern: () => null
		},
		describeExpected(node) {
			return `matched by ${node.source}`
		}
	}

	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test
	condition = `/${this.source}/${this.flags ?? ""}.test(${this.scope.argName})`
	negatedCondition = `!${this.condition}`

	getCheckedDefinitions() {
		return ["string"] as const
	}
}
