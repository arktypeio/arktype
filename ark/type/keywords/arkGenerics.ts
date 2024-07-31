import { GenericHkt, genericNode } from "@ark/schema"
import { liftArray, type conform } from "@ark/util"
import type { Out } from "../ast.js"
import type { exportScope, Module } from "../module.js"
import { scope } from "../scope.js"

const ArkLiftArray = genericNode("T")(
	args => args.T.or(args.T.array()).pipe(liftArray),
	class liftArrayHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown]>
		) => liftArray<(typeof args)[0]> extends infer lifted ?
			(In: (typeof args)[0] | lifted) => Out<lifted>
		:	never
	}
)

const arkGenericsExports = {
	liftArray: ArkLiftArray
}

export type arkGenericsExports = exportScope<typeof arkGenericsExports>

export type arkGenerics = Module<arkGenericsExports>

const $ = scope(arkGenericsExports, {
	prereducedAliases: true,
	ambient: true
})

export const arkGenerics: arkGenerics = $.export()
