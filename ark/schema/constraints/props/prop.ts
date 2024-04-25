import { compileSerializedValue, type Key } from "@arktype/util"
import type { SchemaDef } from "../../node.js"
import type { RawSchema } from "../../schema.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type {
	BaseErrorContext,
	BaseMeta,
	declareNode
} from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import {
	compileErrorContext,
	implementNode,
	type SchemaKind
} from "../../shared/implement.js"
import { intersectNodes } from "../../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { RawConstraint } from "../constraint.js"
import type { ChildSchemaReference } from "./shared.js"

export interface PropDef extends BaseMeta {
	readonly key: Key
	readonly value: SchemaDef | ChildSchemaReference
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
}>

export interface PropErrorContext extends BaseErrorContext<"prop"> {
	key: Key
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
			parse: def => def || undefined
		}
	},
	normalize: def => def,
	defaults: {
		description: node =>
			`${node.compiledKey}${node.optional ? "?" : ""}: ${
				node.value.description
			}`,
		expected: () => "defined",
		actual: () => null
	},
	intersections: {
		prop: (l, r, ctx) => {
			if (l.key !== r.key) return null

			const key = l.key
			let value = intersectNodes(l.value, r.value, ctx)
			const optional = l.optional === true && r.optional === true
			if (value instanceof Disjoint) {
				if (optional) value = ctx.$.keywords.never.raw
				else return value.withPrefixKey(l.compiledKey)
			}
			return ctx.$.node("prop", {
				key,
				value,
				optional
			})
		}
	}
})

export class PropNode extends RawConstraint<PropDeclaration> {
	required = !this.optional
	impliedBasis = this.$.keywords.object.raw
	serializedKey = compileSerializedValue(this.key)
	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey
	expression = `${this.compiledKey}${this.optional ? "?" : ""}: ${
		this.value.expression
	}`

	errorContext = Object.freeze({
		code: "prop",
		description: this.description,
		key: this.key
	})

	compiledErrorContext: string = compileErrorContext(this.errorContext)

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			// ctx will be undefined if this node doesn't have a context-dependent predicate
			ctx?.path.push(this.key)
			const allowed = this.value.traverseAllows((data as any)[this.key], ctx)
			ctx?.path.pop()
			return allowed
		}
		return !this.required
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		ctx.path.push(this.key)
		if (this.key in data) this.value.traverseApply((data as any)[this.key], ctx)
		else if (this.required) ctx.error(this.errorContext)
		ctx.path.pop()
	}

	compile(js: NodeCompiler): void {
		const requiresContext = js.requiresContextFor(this.value)
		if (requiresContext) js.line(`ctx.path.push(${this.serializedKey})`)

		js.if(`${this.serializedKey} in ${js.data}`, () =>
			js.check(this.value, {
				arg: `${js.data}${js.prop(this.key)}`
			})
		)
		if (this.required) {
			js.else(() => {
				if (js.traversalKind === "Apply")
					return js.line(`ctx.error(${this.compiledErrorContext})`)
				else {
					if (requiresContext) js.line(`ctx.path.pop()`)

					return js.return(false)
				}
			})
		}

		if (requiresContext) js.line(`ctx.path.pop()`)
		else js.return(true)
	}
}
