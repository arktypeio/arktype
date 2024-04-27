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
	type ConstraintIntersection,
	type SchemaKind
} from "../../shared/implement.js"
import { intersectNodes } from "../../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { RawConstraint } from "../constraint.js"

export type PropKind = "required" | "optional"

export interface PropDef extends BaseMeta {
	readonly key: Key
	readonly value: SchemaDef
}

export interface PropInner extends PropDef {
	readonly value: RawSchema
}

type BasePropDeclaration<kind extends PropKind = PropKind> = {
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

export abstract class PropNode<
	kind extends PropKind = PropKind
> extends RawConstraint<
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

export interface RequiredErrorContext extends BaseErrorContext<"required"> {
	missingValueDescription: string
}

export type RequiredDeclaration = declareNode<
	BasePropDeclaration<"required"> & { errorContext: RequiredErrorContext }
>

export class RequiredNode extends PropNode<"required"> {
	expression = `${this.compiledKey}: ${this.value.expression}`

	errorContext = Object.freeze({
		code: "required",
		missingValueDescription: this.value.description
	} satisfies RequiredErrorContext)

	compiledErrorContext: string = compileErrorContext(this.errorContext)
}

export const requiredImplementation = implementNode<RequiredDeclaration>({
	kind: "required",
	hasAssociatedError: true,
	intersectionIsOpen: true,
	keys: {
		key: {},
		value: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def)
		}
	},
	normalize: def => def,
	defaults: {
		description: node => `${node.compiledKey}: ${node.value.description}`,
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	},
	intersections: {
		required: intersectProps,
		optional: intersectProps
	}
})

export const optionalImplementation = implementNode<OptionalDeclaration>({
	kind: "optional",
	hasAssociatedError: false,
	intersectionIsOpen: true,
	keys: {
		key: {},
		value: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def)
		}
	},
	normalize: def => def,
	defaults: {
		description: node => `${node.compiledKey}?: ${node.value.description}`
	},
	intersections: {
		optional: intersectProps
	}
})

export type OptionalDeclaration = declareNode<BasePropDeclaration<"optional">>

export class OptionalNode extends PropNode<"optional"> {
	expression = `${this.compiledKey}?: ${this.value.expression}`
}
