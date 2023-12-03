import type { extend } from "@arktype/util"
import { composeParser } from "../parse.js"
import { In, composePrimitiveTraversal } from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import { RefinementNode } from "./shared.js"

export type PatternInner = {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = withAttributes<PatternInner>

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternAttachments = extend<
	PrimitiveConstraintAttachments,
	{ regex: RegExp }
>

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	checks: string
}>

export class PatternNode extends RefinementNode<typeof PatternNode> {
	static declaration: PatternDeclaration
	static parser = this.composeParser({
		kind: "pattern",
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
				  : schema
	})

	regex = new RegExp(this.source, this.flags)

	traverseAllows = this.regex.test
	traverseApply = composePrimitiveTraversal(this, this.traverseAllows)
	condition = `/${this.source}/${this.flags ?? ""}.test(${In})`
	negatedCondition = `!${this.condition}`

	getCheckedDefinitions() {
		return ["string"] as const
	}

	writeDefaultDescription() {
		return `matched by ${this.source}`
	}
}

// intersections: {
// 	// For now, non-equal regex are naively intersected
// 	pattern: () => null
// },
// compile: compilePrimitive
