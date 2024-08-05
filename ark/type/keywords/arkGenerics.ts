import { genericNode } from "@ark/schema"
import { Hkt, liftArray, type merge } from "@ark/util"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
import { scope, type inferScope } from "../scope.js"
import { tsKeywords } from "./tsKeywords.js"

class LiftArrayHkt extends Hkt<[element: unknown]> {
	declare body: liftArray<this[0]> extends infer lifted ?
		(In: this[0] | lifted) => Out<lifted>
	:	never
}

const LiftArray = genericNode("element")(
	args => args.element.or(args.element.array()).pipe(liftArray),
	LiftArrayHkt
)

class MergeHkt extends Hkt<[base: object, props: object]> {
	declare body: merge<this[0], this[1]>
}

const Merge = genericNode(
	["base", tsKeywords.object],
	["props", tsKeywords.object]
)(args => args.base.merge(args.props), MergeHkt)

const arkGenericsExports = {
	liftArray: LiftArray,
	merge: Merge
}

export type arkGenericsExports = inferScope<typeof arkGenericsExports>

export type arkGenerics = Module<arkGenericsExports>

const $ = scope(arkGenericsExports, {
	prereducedAliases: true
})

export const arkGenerics: arkGenerics = $.export()
