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
import {
	compileSerializedValue,
	isDecidedByAllows,
	type NodeCompiler
} from "../shared/compile.ts"
import type { RootKind } from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	applyValue,
	traverseKey,
	type InternalTraversal,
	type AliasDepth
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
	get required(): boolean {
		return this.kind === "required"
	}

	get optional(): boolean {
		return this.kind === "optional"
	}

	impliedBasis: BaseRoot = $ark.intrinsic.object.internal

	get serializedKey(): string {
		return compileSerializedValue(this.key)
	}

	get compiledKey(): string {
		return typeof this.key === "string" ? this.key : printable(this.key)
	}

	protected override initializeFlatRefs(): void {
		this.cache.flatRefs = append(
			this.value.flatRefs.map(ref =>
				flatRef([this.key, ...ref.path], ref.node)
			),
			flatRef([this.key], this.value)
		)
		this.cache.flatMorphs = []
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

	traverseAllows(data: object, ctx: InternalTraversal | AliasDepth): boolean {
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

	traverseApply(data: object, ctx: InternalTraversal): void {
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
		const expression = this.compileExpression(js)
		if (expression !== undefined) {
			js.return(expression)
			return
		}
		const key = js.serialize(this.key)
		js.if(`${key} in data`, () =>
			js.traverseKey(key, `data${js.prop(this.key)}`, this.value)
		)

		if (this.hasKind("required")) {
			js.else(() =>
				js.traversalKind === "Apply" ?
					js.if(js.error(this, key), () => js.return(false))
				:	js.return(false)
			)
		}

		js.return(true)
	}

	compileExpression(js: NodeCompiler): string | undefined {
		const key = js.serialize(this.key)
		const value = `data${js.prop(this.key)}`
		// a missing key reads undefined, which fails a value whose every branch has a basis other than undefined, so its key is checked only to report it
		if (
			this.hasKind("required") &&
			(js.traversalKind === "Allows" ||
				(!this.value.transforms && !this.value.entersResolution)) &&
			this.value.branches.every(branch => {
				const basis = branch.hasKind("intersection") ? branch.basis : branch
				return (
					!!basis?.isBasis() &&
					!(basis.hasKind("unit") && basis.unit === undefined)
				)
			})
		) {
			if (js.traversalKind === "Apply") {
				// a value a condition decides is checked by it before it's applied,
				// a union by its branches
				const condition =
					isDecidedByAllows(this.value) &&
					this.value.compileCondition?.(js, value, true)
				const fails =
					this.value.isBasis() ?
						`!${js.error(this, key)}`
					:	`!ctx.failsIn(${(condition && js.failingApplyOf?.(this.value)) || js.traversal(this.value, "Apply")}, ${value}, ${key}, ${js.site(this)}, data)`
				return condition ? `${condition} || ${fails}` : fails
			}
			// a value whose predicates read ctx is checked at its key's path
			if (
				this.value.allowsRequiresContext &&
				this.value.allowsRequiresTraversal
			)
				return
			return (
				this.value.compileCondition?.(js, value) ??
				js.invoke(this.value, { arg: value })
			)
		}
		const fails = js.keyFails(key, value, this.value)
		if (fails === undefined) return
		return (
			this.hasKind("optional") ? `!(${key} in data) || !(${fails})`
			: js.traversalKind === "Apply" ?
				`${key} in data ? !(${fails}) : !${js.error(this, key)}`
			:	`${key} in data && !(${fails})`
		)
	}
}
