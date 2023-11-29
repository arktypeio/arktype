import type { Node } from "../../base.js"
import { In, compileSerializedValue } from "../../shared/compilation.js"
import type { withAttributes } from "../../shared/declare.js"
import { typeKinds, type TypeKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Inner, Schema } from "../../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import type { PropKind } from "./prop.js"
import { compilePresentProp, type NamedPropAttachments } from "./shared.js"

export type RequiredSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<TypeKind>
}>

export type RequiredInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}>

export type RequiredDeclaration = declareRefinement<{
	kind: "required"
	schema: RequiredSchema
	operand: object
	inner: RequiredInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	attach: NamedPropAttachments
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

export const RequiredImplementation = defineRefinement({
	kind: "required",
	keys: {
		key: {},
		value: {
			child: true,
			parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
		}
	},
	operand: ["object"],
	intersections: {
		required: intersectNamed,
		optional: intersectNamed
	},
	normalize: (schema) => schema,
	writeDefaultDescription: (inner) => `${String(inner.key)}: ${inner.value}`,
	attach: (node) => {
		const serializedKey = compileSerializedValue(node.key)
		return {
			serializedKey,
			compiledKey: typeof node.key === "string" ? node.key : serializedKey,
			assertValidBasis: createValidBasisAssertion(node)
		}
	},
	compile: (node, ctx) => `if(${node.serializedKey} in ${In}) {
		${compilePresentProp(node, ctx)}
	} else {
		${
			ctx.compilationKind === "allows"
				? "return false"
				: `problems.add("provided")`
		}
	}`
})
