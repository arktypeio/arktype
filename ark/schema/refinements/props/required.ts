import type { Node } from "../../base.js"
import {
	compileSerializedValue,
	type Problems
} from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type { TypeKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Inner, Schema } from "../../shared/nodes.js"
import { RefinementNode } from "../shared.js"
import type { PropKind } from "./prop.js"
import type { NamedPropAttachments } from "./shared.js"

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
	static declaration: RequiredDeclaration
	static parser = this.composeParser({
		kind: "required",
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema
	})

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

	getCheckedDefinitions() {
		return ["object"] as const
	}

	writeDefaultDescription() {
		return `${String(this.key)}?: ${this.value}`
	}
}

// intersections: {
// 	required: intersectNamed,
// 	optional: intersectNamed
// },
// writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
// compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
// 	${compilePresentProp(node, ctx)}
// } else {
// 	${
// 		ctx.compilationKind === "allows"
// 			? "return false"
// 			: `problems.add("provided")`
// 	}
// }`
