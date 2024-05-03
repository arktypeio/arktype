import { compileSerializedValue, type Key } from "@arktype/util"
import { BaseConstraint } from "../constraint.js"
import type { SchemaDef } from "../kinds.js"
import type { BaseSchema } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ConstraintIntersection, SchemaKind } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { OptionalDeclaration } from "./optional.js"
import type { RequiredDeclaration } from "./required.js"

export type PropKind = "required" | "optional"

export interface PropDef extends BaseMeta {
	readonly key: Key
	readonly value: SchemaDef
}

export interface PropInner extends PropDef {
	readonly value: BaseSchema
}

export type BasePropDeclaration<kind extends PropKind = PropKind> = {
	kind: kind
	def: PropDef
	normalizedDef: PropDef
	inner: PropInner
	prerequisite: object
	intersectionIsOpen: true
	childKind: SchemaKind
}

export const intersectProps: ConstraintIntersection<PropKind, PropKind> = (
	l,
	r,
	ctx
) => {
	if (l.key !== r.key) return null

	const key = l.key
	let value = intersectNodes(l.value, r.value, ctx)
	const kind: PropKind = l.required || r.required ? "required" : "optional"
	if (value instanceof Disjoint) {
		if (kind === "optional") value = ctx.$.keywords.never.raw
		else return value.withPrefixKey(l.compiledKey)
	}
	return ctx.$.node(kind, {
		key,
		value
	})
}

export abstract class BasePropNode<
	kind extends PropKind = PropKind
> extends BaseConstraint<
	kind extends "required" ? RequiredDeclaration : OptionalDeclaration
> {
	required = this.kind === "required"
	impliedBasis = this.$.keywords.object.raw
	serializedKey = compileSerializedValue(this.key)
	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			// ctx will be undefined if this node isn't context-dependent
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
		else if (this.hasKind("required")) ctx.error(this.errorContext)
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
		if (this.hasKind("required")) {
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
		if (js.traversalKind === "Allows") js.return(true)
	}
}
