import { compileSerializedValue, type Key } from "@arktype/util"
import type { Node, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { BaseConstraint } from "../constraint.js"

export interface PropSchema extends BaseMeta {
	readonly key: Key
	readonly value: TypeSchema
	readonly optional?: boolean
}

export interface PropInner extends BaseMeta {
	readonly key: Key
	readonly value: Node<TypeKind>
	readonly optional?: true
}

export type PropDeclaration = declareNode<{
	kind: "prop"
	schema: PropSchema
	normalizedSchema: PropSchema
	inner: PropInner
	errorContext: {
		key: Key
	}
	prerequisite: object
	intersectionIsOpen: true
	childKind: TypeKind
}>

export class PropNode extends BaseConstraint<PropDeclaration> {
	static implementation: nodeImplementationOf<PropDeclaration> = this.implement(
		{
			hasAssociatedError: true,
			intersectionIsOpen: true,
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.node(schema)
				},
				optional: {
					// normalize { optional: false } to {}
					parse: (schema) => schema || undefined
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `${node.compiledKey}${node.optional ? "?" : ""}: ${
						node.value.description
					}`
				},
				expected() {
					return "defined"
				},
				actual: () => null
			},
			intersections: {
				prop: (l, r, $) => {
					if (l.key !== r.key) {
						return null
					}
					const key = l.key
					const value = l.value.intersect(r.value)
					if (value instanceof Disjoint) {
						return value.withPrefixKey(l.compiledKey)
					}
					return $.node("prop", {
						key,
						value,
						optional: l.optional === true && r.optional === true
					})
				}
			}
		}
	)

	readonly required = !this.optional
	readonly impliedBasis = this.$.keywords.object
	readonly serializedKey = compileSerializedValue(this.key)
	readonly compiledKey =
		typeof this.key === "string" ? this.key : this.serializedKey
	readonly expression = `${this.compiledKey}${this.optional ? "?" : ""}: ${
		this.value.expression
	}`

	readonly errorContext = Object.freeze({
		code: "prop",
		description: this.description,
		key: this.key
	})

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			// ctx will be undefined if this node doesn't have a context-dependent predicate
			ctx?.path.push(this.key)
			const allowed = this.value.traverseAllows((data as any)[this.key], ctx)
			ctx?.path.pop()
			return allowed
		}
		return this.required
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		ctx.path.push(this.key)
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		} else if (this.required) {
			ctx.error(this.errorContext)
		}
		ctx.path.pop()
	}

	compile(js: NodeCompiler): void {
		const requiresContext = js.requiresContextFor(this.value)
		if (requiresContext) {
			js.line(`ctx.path.push(${this.serializedKey})`)
		}

		js.if(`${this.serializedKey} in ${js.data}`, () =>
			js.check(this.value, {
				arg: `${js.data}${js.prop(this.key)}`
			})
		)
		if (this.required) {
			js.else(() => {
				if (js.traversalKind === "Apply") {
					return js.line(`ctx.error(${this.compiledErrorContext})`)
				} else {
					if (requiresContext) {
						js.line(`ctx.path.pop()`)
					}
					return js.return(false)
				}
			})
		}

		if (requiresContext) js.line(`ctx.path.pop()`)
		else js.return(true)
	}
}
