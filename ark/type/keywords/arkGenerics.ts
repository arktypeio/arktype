import { genericNode } from "@ark/schema"
import * as util from "@ark/util"
import { Hkt } from "@ark/util"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
import { scope, type inferScope } from "../scope.js"
import { tsKeywordsModule } from "./tsKeywords.js"

class liftArrayHkt extends Hkt<[element: unknown]> {
	declare body: util.liftArray<this[0]> extends infer lifted ?
		(In: this[0] | lifted) => Out<lifted>
	:	never
}

const liftArray = genericNode("element")(
	args => args.element.or(args.element.array()).pipe(util.liftArray),
	liftArrayHkt
)

class mergeHkt extends Hkt<[base: object, props: object]> {
	declare body: util.merge<this[0], this[1]>
}

const merge = genericNode(
	["base", tsKeywordsModule.object],
	["props", tsKeywordsModule.object]
)(args => args.base.merge(args.props), mergeHkt)

const arkGenericsExports = {
	liftArray,
	merge
}

export type arkGenericsExports = inferScope<typeof arkGenericsExports>

export type arkGenericsModule = Module<arkGenericsExports>

const $ = scope(arkGenericsExports, {
	prereducedAliases: true
})

export const arkGenericsModule: arkGenericsModule = $.export()
