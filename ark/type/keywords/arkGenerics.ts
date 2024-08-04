import { GenericHkt, genericNode } from "@ark/schema"
import { liftArray, type conform, type merge } from "@ark/util"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
import { scope, type inferScope } from "../scope.js"
import { tsKeywords } from "./tsKeywords.js"

const ArkLiftArray = genericNode("element")(
	args => args.element.or(args.element.array()).pipe(liftArray),
	class liftArrayHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown]>
		) => liftArray<(typeof args)[0]> extends infer lifted ?
			(In: (typeof args)[0] | lifted) => Out<lifted>
		:	never
	}
)

const ArkMerge = genericNode(
	["base", tsKeywords.object],
	["props", tsKeywords.object]
)(
	args => args.base.merge(args.props),
	class mergeHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, object]>
		) => merge<(typeof args)[0], (typeof args)[1]>
	}
)

const arkGenericsExports = {
	liftArray: ArkLiftArray,
	merge: ArkMerge
}

export type arkGenericsExports = inferScope<typeof arkGenericsExports>

export type arkGenerics = Module<arkGenericsExports>

const $ = scope(arkGenericsExports, {
	prereducedAliases: true
})

export const arkGenerics: arkGenerics = $.export()
