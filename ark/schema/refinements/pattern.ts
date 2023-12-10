import type { CompilationContext } from "../scope.js"
import type { declarePrimitive, withAttributes } from "../shared/declare.js"
import type { NodeParserImplementation } from "../shared/define.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { RefinementNode } from "./shared.js"

export type PatternInner = {
	readonly source: string
	readonly flags?: string
}

export type NormalizedPatternSchema = withAttributes<PatternInner>

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternDeclaration = declarePrimitive<{
	kind: "pattern"
	schema: PatternSchema
	normalizedSchema: NormalizedPatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	checks: string
}>

export class PatternNode extends RefinementNode<PatternDeclaration> {
	static parser: NodeParserImplementation<PatternDeclaration> = {
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
	}

	static intersections: NodeIntersections<PatternDeclaration> = {
		// For now, non-equal regex are naively intersected
		pattern: () => null
	}

	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test
	condition = `/${this.source}/${this.flags ?? ""}.test(${this.scope.argName})`
	negatedCondition = `!${this.condition}`

	compileBody(ctx: CompilationContext) {
		return this.scope.compilePrimitive(this, ctx)
	}

	getCheckedDefinitions() {
		return ["string"] as const
	}

	writeDefaultDescription() {
		return `matched by ${this.source}`
	}
}
