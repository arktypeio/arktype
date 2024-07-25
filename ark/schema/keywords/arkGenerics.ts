import { liftArray, type conform } from "@ark/util"
import { GenericHkt } from "../generic.js"
import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { generic, schemaScope } from "../scope.js"

const ArkLiftArray = generic("T")(
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

export type arkGenericsExports = typeof arkGenericsExports

export type arkGenerics = SchemaModule<arkGenericsExports>

const $ = schemaScope(arkGenericsExports)

export const arkGenerics: arkGenerics = $.export()
