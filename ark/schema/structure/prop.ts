import { append, type Key } from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { nodeOfKind, RootSchema } from "../kinds.ts"
import {
	flatRef,
	type BaseNode,
	type DeepNodeTransformation,
	type DeepNodeTransformContext
} from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema } from "../shared/declare.ts"
import type { RootKind } from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	applyValue,
	traverseKey,
	type TraverseAllows,
	type TraverseApply
} from "../shared/traversal.ts"
import type { Optional } from "./optional.ts"
import type { Required } from "./required.ts"

export declare namespace Prop {
	export type Kind = "required" | "optional"

	export type Node = nodeOfKind<Kind>

	export interface Schema extends BaseNormalizedSchema {
		readonly key: Key
		readonly value: RootSchema
	}

	export interface Inner {
		readonly key: Key
		readonly value: BaseRoot
	}

	export interface Declaration<kind extends Kind = Kind> {
		kind: kind
		prerequisite: object
		intersectionIsOpen: true
		childKind: RootKind
	}
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

	protected override initializeFlatRefs(): void {
		this._flatRefs = append(
			this.value.flatRefs.map(ref =>
				flatRef([this.key, ...ref.path], ref.node)
			),
			flatRef([this.key], this.value)
		)
		this._flatMorphs = []
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

	hasDefault(): this is Optional.Node.withDefault {
		return "default" in this.inner
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			// ctx will be undefined if this node isn't context-dependent
			return traverseKey(
				this.key,
				() => this.value.traverseAllows((data as any)[this.key], ctx),
				ctx
			)
		}
		return this.optional
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			traverseKey(
				this.key,
				() => applyValue(this.value, (data as any)[this.key], ctx),
				ctx
			)
		} else if (this.hasKind("required"))
			ctx.errorFromNodeContext(this.errorContext)
	}

	compile(js: NodeCompiler): void {
		js.if(`${this.serializedKey} in data`, () =>
			js.traverseKey(this.serializedKey, `data${js.prop(this.key)}`, this.value)
		)

		if (this.hasKind("required")) {
			js.else(() =>
				js.traversalKind === "Apply" ?
					js.line(
						`ctx.errorFromNodeContext(${js.errorContext(this.errorContext)})`
					)
				:	js.return(false)
			)
		}

		if (js.traversalKind === "Allows") js.return(true)
	}
}
