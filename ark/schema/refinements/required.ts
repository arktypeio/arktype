import type { Node, TypeSchema } from "../base.js"
import type { Inner } from "../kinds.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type {
	declareComposite,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import type { NodeParserImplementation, TypeKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { compileSerializedValue } from "../shared/registry.js"
import {
	RefinementNode,
	compilePresentProp,
	type NamedPropKind
} from "./shared.js"

export type RequiredSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: TypeSchema
}>

export type RequiredInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type RequiredDeclaration = declareComposite<{
	kind: "required"
	schema: RequiredSchema
	normalizedSchema: RequiredSchema
	inner: RequiredInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	checks: object
}>

const intersectNamed = (
	l: Node<NamedPropKind>,
	r: Node<NamedPropKind>
): Inner<NamedPropKind> | Disjoint | null => {
	if (l.key !== r.key) {
		return null
	}
	const required = l.key
	const value = l.value.intersect(r.value)
	if (value instanceof Disjoint) {
		return value
	}
	return {
		key: required,
		value
	}
}

export class RequiredNode extends RefinementNode<RequiredDeclaration> {
	static parser: NodeParserImplementation<RequiredDeclaration> = {
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema
	}

	static intersections: NodeIntersections<RequiredDeclaration> = {
		required: intersectNamed,
		optional: intersectNamed
	}

	readonly hasOpenIntersection = true

	serializedKey = compileSerializedValue(this.key)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.key in data && this.value.traverseAllows((data as any)[this.key], ctx)

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		} else {
			ctx.problems.add("provided")
		}
	}

	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey

	compileBody(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.argName}) {
			${compilePresentProp(this, ctx)}
		} else {
			${
				ctx.compilationKind === "allows"
					? "return false"
					: `problems.add("provided")`
			}
		}`
	}

	getCheckedDefinitions() {
		return ["object"] as const
	}

	writeDefaultDescription() {
		return `${String(this.compiledKey)}: ${this.value}`
	}
}
