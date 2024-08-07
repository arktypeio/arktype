import { append, printable, throwParseError, unset, type Key } from "@ark/util"
import { BaseConstraint } from "../constraint.js"
import type { nodeOfKind, RootSchema } from "../kinds.js"
import {
	flatRef,
	type BaseNode,
	type DeepNodeTransformation,
	type DeepNodeTransformContext,
	type FlatRef
} from "../node.js"
import type { Morph } from "../roots/morph.js"
import type { BaseRoot } from "../roots/root.js"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.js"
import type { BaseNormalizedSchema } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { IntersectionContext, RootKind } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import { $ark, registeredReference } from "../shared/registry.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { Optional } from "./optional.js"
import type { Required } from "./required.js"

export namespace Prop {
	export type Kind = "required" | "optional"

	export type Node = nodeOfKind<Kind>

	export interface Schema extends BaseNormalizedSchema {
		readonly key: Key
		readonly value: RootSchema
	}

	export interface Inner extends Schema {
		readonly value: BaseRoot
	}

	export interface Declaration<kind extends Kind = Kind> {
		kind: kind
		prerequisite: object
		intersectionIsOpen: true
		childKind: RootKind
	}
}

export const intersectProps = (
	l: nodeOfKind<Prop.Kind>,
	r: nodeOfKind<Prop.Kind>,
	ctx: IntersectionContext
): nodeOfKind<Prop.Kind> | Disjoint | null => {
	if (l.key !== r.key) return null

	const key = l.key
	let value = intersectNodes(l.value, r.value, ctx)
	const kind: Prop.Kind = l.required || r.required ? "required" : "optional"
	if (value instanceof Disjoint) {
		if (kind === "optional") value = $ark.intrinsic.never.internal
		else {
			// if either operand was optional, the Disjoint has to be treated as optional
			return value.withPrefixKey(
				l.key,
				l.required && r.required ? "required" : "optional"
			)
		}
	}

	if (kind === "required") {
		return ctx.$.node("required", {
			key,
			value
		})
	}

	const defaultIntersection =
		l.hasDefault() ?
			r.hasDefault() ?
				l.default === r.default ?
					l.default
				:	throwParseError(
						`Invalid intersection of default values ${printable(l.default)} & ${printable(r.default)}`
					)
			:	l.default
		: r.hasDefault() ? r.default
		: unset

	return ctx.$.node("optional", {
		key,
		value,
		// unset is stripped during parsing
		default: defaultIntersection
	})
}

export abstract class BaseProp<
	kind extends Prop.Kind = Prop.Kind
> extends BaseConstraint<
	kind extends "required" ? Required.Declaration : Optional.Declaration
> {
	required: boolean = this.kind === "required"
	optional: boolean = this.kind === "optional"
	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
	serializedKey: string = compileSerializedValue(this.key)
	compiledKey: string =
		typeof this.key === "string" ? this.key : this.serializedKey

	override get flatRefs(): FlatRef[] {
		return append(
			this.value.flatRefs.map(ref =>
				flatRef([this.key, ...ref.path], ref.node)
			),
			flatRef([this.key], this.value)
		)
	}

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		ctx.path.push(this.key)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	private defaultValueMorphs: Morph[] = [
		data => {
			data[this.key] = (this as Optional.Node).default
			return data
		}
	]

	private defaultValueMorphsReference = registeredReference(
		this.defaultValueMorphs
	)

	hasDefault(): this is Optional.Node & { default: unknown } {
		return "default" in this
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			// ctx will be undefined if this node isn't context-dependent
			ctx?.path.push(this.key)
			const allowed = this.value.traverseAllows((data as any)[this.key], ctx)
			ctx?.path.pop()
			return allowed
		}
		return this.optional
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			ctx.path.push(this.key)
			this.value.traverseApply((data as any)[this.key], ctx)
			ctx.path.pop()
		} else if (this.hasKind("required")) ctx.error(this.errorContext)
		else if (this.hasKind("optional") && this.hasDefault())
			ctx.queueMorphs(this.defaultValueMorphs)
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
				js.line(`ctx.queueMorphs(${this.defaultValueMorphsReference})`)
			)
		}

		if (js.traversalKind === "Allows") js.return(true)
	}
}
