import { BaseNode, type Node, type TypeSchema } from "../base.js"
import type { Inner } from "../kinds.js"
import type { CompilationContext } from "../shared/compile.js"
import type {
	BaseComponent,
	declareNode,
	withBaseMeta
} from "../shared/declare.js"
import {
	createBasisAssertion,
	type TypeKind,
	type nodeImplementationOf
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import { compileSerializedValue } from "../traversal/registry.js"
import {
	compileKey,
	compilePresentPropAllows,
	compilePresentPropApply,
	type NamedPropKind
} from "./prop.js"

export type RequiredSchema = withBaseMeta<{
	readonly key: string | symbol
	readonly value: TypeSchema
}>

export type RequiredInner = withBaseMeta<{
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}>

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredSchema
	normalizedSchema: RequiredSchema
	inner: RequiredInner
	intersections: {
		required: "required" | Disjoint | null
		optional: "required" | Disjoint | null
	}
	expectedContext: {
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

export class RequiredNode
	extends BaseNode<object, RequiredDeclaration, typeof RequiredNode>
	implements BaseComponent
{
	static implementation: nodeImplementationOf<RequiredDeclaration> =
		this.implement({
			hasAssociatedError: true,
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
				description(inner) {
					return `${compileKey(inner.key)}: ${inner.value}`
				},
				expected() {
					return "provided"
				},
				actual: () => null
			}
		})

	readonly hasOpenIntersection = true
	readonly constraintGroup = "props"

	get prerequisiteSchemas() {
		return ["object"] as const
	}

	assertValidBasis = createBasisAssertion(this)

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

	// TODO: fix base
	readonly baseRequiredErrorContext = { code: "required", key: this.key }

	compileApply(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.dataArg}) {
			${compilePresentPropApply(this, ctx)}
		} else {
			${ctx.ctxArg}.error(${JSON.stringify(this.baseRequiredErrorContext)})
		}`
	}

	compileAllows(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.dataArg}) {
			${compilePresentPropAllows(this, ctx)}
		} else {
			return false
		}`
	}

	getCheckedDefinitions() {
		return ["object"] as const
	}
}
