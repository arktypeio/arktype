import { type Key, compileSerializedValue } from "@arktype/util"
import {
	type BaseAttachments,
	type SchemaDef,
	implementNode
} from "../../base.js"
import { tsKeywords } from "../../keywords/tsKeywords.js"
import type { RawSchema } from "../../schemas/schema.js"
import type {
	BaseErrorContext,
	BaseMeta,
	declareNode
} from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { SchemaKind } from "../../shared/implement.js"
import type { BaseConstraint, ConstraintAttachments } from "../constraint.js"

export interface PropDef extends BaseMeta {
	readonly key: Key
	readonly value: SchemaDef
	readonly optional?: boolean
}

export interface PropInner extends BaseMeta {
	readonly key: Key
	readonly value: RawSchema
	readonly optional?: true
}

export type PropDeclaration = declareNode<{
	kind: "prop"
	def: PropDef
	normalizedDef: PropDef
	inner: PropInner
	errorContext: PropErrorContext
	prerequisite: object
	intersectionIsOpen: true
	childKind: SchemaKind
	attachments: PropAttachments
}>

export interface PropErrorContext extends BaseErrorContext {
	key: Key
}

export interface PropAttachments
	extends BaseAttachments<PropDeclaration>,
		ConstraintAttachments {
	required: boolean
	compiledKey: string
	serializedKey: string
	errorContext: PropErrorContext
}

export const propImplementation = implementNode<PropDeclaration>({
	kind: "prop",
	hasAssociatedError: true,
	intersectionIsOpen: true,
	keys: {
		key: {},
		value: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def)
		},
		optional: {
			// normalize { optional: false } to {}
			parse: (def) => def || undefined
		}
	},
	normalize: (def) => def,
	defaults: {
		description: (node) =>
			`${node.compiledKey}${node.optional ? "?" : ""}: ${
				node.value.description
			}`,
		expected: () => "defined",
		actual: () => null
	},
	intersections: {
		prop: (l, r, $) => {
			if (l.key !== r.key) {
				return null
			}
			const key = l.key
			let value = l.value.intersect(r.value)
			const optional = l.optional === true && r.optional === true
			if (value instanceof Disjoint) {
				if (optional) value = tsKeywords.never as never
				else return value.withPrefixKey(l.compiledKey)
			}
			return $.node("prop", {
				key,
				value,
				optional
			})
		}
	},
	construct: (self) => {
		const required = !self.optional
		const serializedKey = compileSerializedValue(self.key)
		const compiledKey =
			typeof self.key === "string" ? self.key : serializedKey
		const errorContext = Object.freeze({
			code: "prop",
			description: self.description,
			key: self.key
		})
		return {
			required,
			serializedKey,
			compiledKey,
			errorContext,
			expression: `${compiledKey}${self.optional ? "?" : ""}: ${
				self.value.expression
			}`,
			impliedBasis: tsKeywords.object,
			traverseAllows(data, ctx) {
				if (this.key in data) {
					// ctx will be undefined if this node doesn't have a context-dependent predicate
					ctx?.path.push(this.key)
					const allowed = this.value.traverseAllows(
						(data as any)[this.key],
						ctx
					)
					ctx?.path.pop()
					return allowed
				}
				return required
			},
			traverseApply(data, ctx) {
				ctx.path.push(this.key)
				if (this.key in data) {
					this.value.traverseApply((data as any)[this.key], ctx)
				} else if (required) {
					ctx.error(errorContext)
				}
				ctx.path.pop()
			},
			compile(js) {
				const requiresContext = js.requiresContextFor(this.value)
				if (requiresContext) {
					js.line(`ctx.path.push(${serializedKey})`)
				}

				js.if(`${serializedKey} in ${js.data}`, () =>
					js.check(this.value, {
						arg: `${js.data}${js.prop(this.key)}`
					})
				)
				if (required) {
					js.else(() => {
						if (js.traversalKind === "Apply") {
							return js.line(
								`ctx.error(${this.compiledErrorContext})`
							)
						}
						if (requiresContext) {
							js.line("ctx.path.pop()")
						}
						return js.return(false)
					})
				}

				if (requiresContext) js.line("ctx.path.pop()")
				else js.return(true)
			}
		}
	}
})

export type PropNode = BaseConstraint<PropDeclaration>
