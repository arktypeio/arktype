import type { Node } from "../../base.js"
import {
	In,
	compileSerializedValue,
	type Problem
} from "../../shared/compilation.js"
import type { withAttributes } from "../../shared/declare.js"
import { schemaKinds, type SchemaKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { Definition, Inner } from "../../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "../shared.js"
import type { PropKind } from "./prop.js"
import type { NamedPropAttachments } from "./shared.js"

export type RequiredDefinition = withAttributes<{
	readonly key: string | symbol
	readonly value: Definition<SchemaKind>
}>

export type RequiredInner = withAttributes<{
	readonly key: string | symbol
	readonly value: Node<SchemaKind>
}>

export type RequiredDeclaration = declareRefinement<{
	kind: "required"
	schema: RequiredDefinition
	operands: object
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
			parse: (schema, ctx) => ctx.scope.schemaWithKindIn(schemaKinds, schema)
		}
	},
	operands: ["object"],
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
		return ${node.value.compileInvocation(
			{
				...ctx,
				path: [...ctx.path, node.compiledKey]
			},
			node.compiledKey
		)}
	} else {
		${
			ctx.compilationKind === "allows"
				? "return false"
				: `problems.push(${JSON.stringify({
						path: [...ctx.path, node.compiledKey],
						message: `Must be provided`
				  } satisfies Problem)})`
		}
	}`
})
