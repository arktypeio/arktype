import type { extend } from "@arktype/util"
import {
	In,
	compilePrimitive,
	type CompilationContext
} from "../shared/compilation.js"
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
	static readonly kind = "pattern"
	static declaration: PatternDeclaration
	static parser = this.composeParser({
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
	static intersections = this.defineIntersections({
		// For now, non-equal regex are naively intersected
		pattern: () => null
	})

	regex = new RegExp(this.source, this.flags)

	traverseAllows = this.regex.test
	traverseApply = this.createPrimitiveTraversal()
	condition = `/${this.source}/${this.flags ?? ""}.test(${In})`
	negatedCondition = `!${this.condition}`

	compileBody(ctx: CompilationContext) {
		return compilePrimitive(this, ctx)
	}

	getCheckedDefinitions() {
		return ["string"] as const
	}

	writeDefaultDescription() {
		return `matched by ${this.source}`
	}
}
