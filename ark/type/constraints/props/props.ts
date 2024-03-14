import { DynamicBase, conflatenateAll, morph, reference } from "@arktype/util"
import type { Node } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { PropKind } from "../../shared/implement.js"
import type { IntersectionInner } from "../../types/intersection.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "throw" | "prune"

export type PropsGroupInput = Pick<
	IntersectionInner,
	PropKind | "onExtraneousKey"
>

export class PropsGroup extends DynamicBase<PropsGroupInput> {
	readonly exhaustive =
		this.onExtraneousKey !== undefined || this.index !== undefined
	readonly all = conflatenateAll<Node<PropKind>>(
		this.prop,
		this.index,
		this.sequence
	)
	readonly nameSet = this.prop
		? morph(this.prop, (i, node) => [node.key, 1] as const)
		: {}
	readonly nameSetReference = reference(this.nameSet)
	readonly description = describeProps(this, "description")
	readonly expression = describeProps(this, "expression")

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this.all.every((prop) => prop.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this.all.forEach((prop) => prop.traverseApply(data as never, ctx))

	compile(js: NodeCompiler): void {
		if (this.exhaustive) {
			this.compileExhaustive(js)
		} else {
			this.compileEnumerable(js)
		}
	}

	protected compileEnumerable(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.all.forEach((node) =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
		} else {
			this.all.forEach((node) => js.line(js.invoke(node)))
		}
	}

	protected compileExhaustive(js: NodeCompiler): void {
		this.prop?.forEach((prop) => js.check(prop))
		this.sequence?.compile(js)
		if (this.sequence) js.check(this.sequence)
		js.forIn(js.data, () => {
			if (this.onExtraneousKey) {
				js.let("matched", false)
			}
			this.index?.forEach((node) => {
				js.if(
					`${js.invoke(node.signature, { arg: "k", kind: "Allows" })}`,
					() => {
						if (js.traversalKind === "Allows") {
							js.if(`!${js.invoke(node.value, { arg: `${js.data}[k]` })}`, () =>
								js.return(false)
							)
						} else {
							js.line(js.invoke(node.value, { arg: `${js.data}[k]` }))
						}
						if (this.onExtraneousKey) {
							js.set("matched", true)
						}
						return js
					}
				)
			})
			if (this.onExtraneousKey) {
				if (this.prop?.length !== 0) {
					js.line(`matched ||= k in ${this.nameSetReference}`)
				}
				if (this.sequence) {
					js.line(`matched ||= ${arrayIndexMatcherReference}.test(k)`)
				}
				// TODO: replace error
				js.if("!matched", () => js.line(`throw new Error("strict")`))
			}
			return js
		})
	}
}

const describeProps = (
	inner: PropsGroupInput,
	childStringProp: "expression" | "description"
) => {
	if (inner.prop || inner.index) {
		const parts = inner.index?.map(String) ?? []
		inner.prop?.forEach((node) => parts.push(node[childStringProp]))
		const objectLiteralDescription = `${
			inner.onExtraneousKey ? "exact " : ""
		}{ ${parts.join(", ")} }`
		return inner.sequence
			? `${objectLiteralDescription} & ${inner.sequence.description}`
			: objectLiteralDescription
	}
	return inner.sequence?.description ?? "{}"
}
