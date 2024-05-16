import {
	compileSerializedValue,
	registeredReference,
	type Key
} from "@arktype/util"
import { BaseConstraint } from "../constraint.js"
import type { Node, RootSchema } from "../kinds.js"
import type { BaseRoot } from "../roots/root.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { IntersectionContext, RootKind } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import type { OptionalDeclaration, OptionalNode } from "./optional.js"
import type { RequiredDeclaration } from "./required.js"

export type PropKind = "required" | "optional"

export type PropNode = Node<PropKind>

export interface BasePropSchema extends BaseMeta {
	readonly key: Key
	readonly value: RootSchema
}

export interface BasePropInner extends BasePropSchema {
	readonly value: BaseRoot
}

export type BasePropDeclaration<kind extends PropKind = PropKind> = {
	kind: kind
	prerequisite: object
	intersectionIsOpen: true
	childKind: RootKind
}

export const intersectProps = (
	l: Node<PropKind>,
	r: Node<PropKind>,
	ctx: IntersectionContext
): Node<PropKind> | Disjoint | null => {
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

export abstract class BaseProp<
	kind extends PropKind = PropKind
> extends BaseConstraint<
	kind extends "required" ? RequiredDeclaration : OptionalDeclaration
> {
	required: boolean = this.kind === "required"
	impliedBasis: BaseRoot = this.$.keywords.object.raw
	serializedKey: string = compileSerializedValue(this.key)
	compiledKey: string =
		typeof this.key === "string" ? this.key : this.serializedKey

	private defaultValueArgs: Parameters<TraversalContext["queueMorphs"]> = [
		[data => (data[this.key] = (this as OptionalNode).default)],
		{
			relativePath: [this.key]
		}
	]

	private defaultValueArgsReference = registeredReference(this.defaultValueArgs)

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
		if (this.key in data) {
			ctx.path.push(this.key)
			this.value.traverseApply((data as any)[this.key], ctx)
			ctx.path.pop()
		} else if (this.hasKind("required")) ctx.error(this.errorContext)
		else if ("default" in this) ctx.queueMorphs(...this.defaultValueArgs)
	}

	compile(js: NodeCompiler): void {
		js.if(`${this.serializedKey} in data`, () =>
			js.traverseKey(this.serializedKey, `data${js.prop(this.key)}`, this.value)
		)

		if (this.hasKind("required")) {
			js.else(() => {
				if (js.traversalKind === "Apply")
					return js.line(`ctx.error(${this.compiledErrorContext})`)
				else return js.return(false)
			})
		} else if (js.traversalKind === "Apply" && "default" in this) {
			js.else(() =>
				js.line(`ctx.queueMorphs(...${this.defaultValueArgsReference})`)
			)
		}

		if (js.traversalKind === "Allows") js.return(true)
	}
}
