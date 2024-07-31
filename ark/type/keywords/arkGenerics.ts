import { GenericHkt, genericNode } from "@ark/schema"
import { liftArray, type conform } from "@ark/util"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
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

export type arkGenericsExports = Module<typeof arkGenericsExports>

export type arkGenerics = arkGenericsExports

const $ = scope(arkGenericsExports)

export const arkGenerics: arkGenerics = $.export()
