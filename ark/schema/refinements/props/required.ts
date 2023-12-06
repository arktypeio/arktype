import type { Node } from "../../base.js"
import {
	In,
	compileSerializedValue,
	type CompilationContext,
	type Problems
} from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type { NodeParserImplementation, TypeKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { NodeIntersections } from "../../shared/intersect.js"
import type { Inner, Schema } from "../../shared/nodes.js"
import { RefinementNode } from "../shared.js"
import type { PropKind } from "./prop.js"
import { compilePresentProp } from "./shared.js"

export type RequiredSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<TypeKind>
}>

export type RequiredInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredSchema
	inner: RequiredInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	checks: object
}>

const intersectNamed = (
	l: Node<PropKind>,
	r: Node<PropKind>
): Inner<PropKind> | Disjoint | null => {
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

export class RequiredNode extends RefinementNode<typeof RequiredNode> {
	static readonly kind = "required"
	static declaration: RequiredDeclaration
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

	serializedKey = compileSerializedValue(this.key)

	traverseAllows = (data: object, problems: Problems) =>
		this.key in data &&
		this.value.traverseAllows((data as any)[this.key], problems)

	traverseApply = (data: object, problems: Problems) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], problems)
		} else {
			problems.add("provided")
		}
	}

	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey

	compileBody(ctx: CompilationContext) {
		return `if(${this.serializedKey} in ${In}) {
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
