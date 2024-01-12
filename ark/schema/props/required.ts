import type { Node, TypeSchema } from "../base.js"
import type { Inner } from "../kinds.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import type { TypeKind, nodeImplementationOf } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import { compileSerializedValue } from "../traversal/registry.js"
import {
	BaseProp,
	compileKey,
	compilePresentProp,
	type NamedPropKind
} from "./prop.js"

export type RequiredSchema = withBaseMeta<{
	readonly key: string | symbol
	readonly value: TypeSchema
}>

export type RequiredInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredSchema
	normalizedSchema: RequiredSchema
	inner: RequiredInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	errorContext: {
		key: string | symbol
	}
	prerequisite: object
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

export class RequiredNode extends BaseProp<
	RequiredDeclaration,
	typeof RequiredNode
> {
	static implementation: nodeImplementationOf<RequiredDeclaration> =
		this.implement({
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				}
			},
			normalize: (schema) => schema,
			intersections: { required: intersectNamed, optional: intersectNamed },
			defaults: {
				expected(inner) {
					return `${compileKey(inner.key)}: ${inner.value}`
				},
				actual: () => null,
				problem: this.defaultProblem,
				message: this.defaultMessage
			}
		})

	readonly hasOpenIntersection = true

	serializedKey = compileSerializedValue(this.key)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.key in data && this.value.traverseAllows((data as any)[this.key], ctx)

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		} else {
			ctx.error("provided")
		}
	}

	compiledKey = compileKey(this.key)

	compileBody(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.argName}) {
			${compilePresentProp(this, ctx)}
		} else {
			${ctx.compilationKind === "allows" ? "return false" : `errors.add("provided")`}
		}`
	}

	getCheckedDefinitions() {
		return ["object"] as const
	}
}
