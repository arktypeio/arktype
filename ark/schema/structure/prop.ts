import { printable, type Key } from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { nodeOfKind } from "../kinds.ts"
import {
	flatRefsAt,
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
	travKey,
	type AliasDepth,
	type InternalTraversal
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
		stacks: true
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

	implied: BaseRoot = $ark.kw.object.internal

	get serializedKey(): string {
		return compileSerializedValue(this.key)
	}

	/** its key as a path prints it, a symbol by its name */
	get keyStr(): string {
		return typeof this.key === "string" ? this.key : printable(this.key)
	}

	protected override initFlat(): void {
		this.c.flatRefs = flatRefsAt(this.key, this.value)
		this.c.flatMorphs = []
	}

	protected override _tf(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		ctx.path.push(this.key)
		const result = super._tf(mapper, ctx)
		ctx.path.pop()
		return result
	}

	/** whether it's an optional prop with a default */
	hasDef(): this is Optional.Node.withDefault {
		return "default" in this.inner
	}

	tAllows(data: object, ctx: InternalTraversal | AliasDepth): boolean {
		if (this.key in data) {
			// ctx will be undefined if this node isn't context-dependent
			return travKey(
				this.key,
				() => this.value.tAllows((data as any)[this.key], ctx),
				ctx
			)
		}
		return this.optional
	}

	tApply(data: object, ctx: InternalTraversal): void {
		if (this.key in data) {
			travKey(
				this.key,
				() => applyValue(this.value, (data as any)[this.key], ctx),
				ctx
			)
		} else if (this.is("required"))
			travKey(this.key, () => ctx.nodeError(this.errorCtx, data), ctx)
	}

	compile(js: NodeCompiler): void {
		const expression = this.jsExpression(js)
		if (expression !== undefined) {
			js.return(expression)
			return
		}
		const key = js.serialize(this.key)
		js.if(`${key} in data`, () =>
			js.travKey(key, `data${js.prop(this.key)}`, this.value)
		)

		if (this.is("required")) {
			js.else(() =>
				js.trav === "Apply" ?
					js.if(js.error(this, key), () => js.return(false))
				:	js.return(false)
			)
		}

		js.return(true)
	}

	jsExpression(js: NodeCompiler): string | undefined {
		const key = js.serialize(this.key)
		const value = `data${js.prop(this.key)}`
		// a value no branch of which allows undefined fails a missing key too
		if (
			this.is("required") &&
			(js.trav === "Allows" || (!this.value.tfs && !this.value.entersAlias)) &&
			this.value.branches.every(branch => {
				// Allows checks a morph's input
				const input = branch.is("morph") ? branch.head : branch
				const basis = input?.is("intersection") ? input.basis : input
				return (
					!!basis?.isBasis() && !(basis.is("unit") && basis.unit === undefined)
				)
			})
		) {
			if (js.trav === "Apply") {
				// a value a condition decides is checked by it before it's applied,
				// a union by its branches
				const condition =
					isDecidedByAllows(this.value) && this.value.jsCond?.(js, value)
				const site = condition && js.failingSiteOf?.(this)
				const fails =
					this.value.isBasis() ? `!${js.error(this, key)}`
					: site ? `!${js.fails("failsAt", `${site}, data, ${key}`)}`
					: `!${js.fails("failsIn", `${(condition && js.failingApplyOf?.(this.value)) || js.traversal(this.value, "Apply")}, data, ${key}, ${js.site(this)}`)}`
				return condition ? `${condition} || ${fails}` : fails
			}
			// a value whose predicates read ctx is checked at its key's path
			if (this.value.allowsCtx && this.value.checksCtx) return
			return (
				this.value.jsCond?.(js, value) ?? js.inv(this.value, { arg: value })
			)
		}
		const fails = js.keyFails(key, value, this.value)
		if (fails === undefined) return
		return (
			this.is("optional") ? `!(${key} in data) || !(${fails})`
			: js.trav === "Apply" ?
				`${key} in data ? !(${fails}) : !${js.error(this, key)}`
			:	`${key} in data && !(${fails})`
		)
	}
}
