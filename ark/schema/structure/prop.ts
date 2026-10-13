import { append, printable, type Key } from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { nodeOfKind } from "../kinds.ts"
import {
	flatRef,
	type BaseNode,
	type DeepNodeTransformation,
	type DeepNodeTransformContext
} from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.ts"
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
		typeof this.key === "string" ? this.key : printable(this.key)

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
		} else if (this.hasKind("required")) {
			traverseKey(
				this.key,
				() => ctx.errorFromNodeContext(this.errorContext, data),
				ctx
			)
		}
	}

	compile(js: NodeCompiler): void {
		const key = js.serialize(this.key)
		const value = `data${js.prop(this.key)}`
		// a missing key reads undefined, which fails a value whose every branch has a basis other than undefined, so its key is checked only to report it
		if (
			js.traversalKind === "Apply" &&
			this.hasKind("required") &&
			!this.value.transforms &&
			!this.value.entersResolution &&
			this.value.branches.every(branch => {
				const basis = branch.hasKind("intersection") ? branch.basis : branch
				return (
					!!basis?.isBasis() &&
					!(basis.hasKind("unit") && basis.unit === undefined)
				)
			})
		) {
			js.return(
				this.value.isBasis() ?
					`${this.value.compileCondition(js, value)} || !${js.error(this, key)}`
				:	`!ctx.failsIn(${js.traversal(this.value, "Apply")}, ${value}, ${key}, ${js.site(this)}, data)`
			)
			return
		}

		js.if(`${key} in data`, () => js.traverseKey(key, value, this.value))

		if (this.hasKind("required")) {
			js.else(() =>
				js.traversalKind === "Apply" ?
					js.if(js.error(this, key), () => js.return(false))
				:	js.return(false)
			)
		}

		js.return(true)
	}
}
