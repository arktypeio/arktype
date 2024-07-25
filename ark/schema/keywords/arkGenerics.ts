import { liftArray, type conform, type Hkt } from "@ark/util"
import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { generic, schemaScope } from "../scope.js"

class ArkLiftArray extends generic("T")(args =>
	args.T.or(args.T.array()).pipe(liftArray)
) {
	declare hkt: (
		args: conform<this[Hkt.args], [unknown]>
	) => liftArray<(typeof args)[0]> extends infer lifted ?
		(In: (typeof args)[0] | lifted) => Out<lifted>
	:	never
}

const arkGenericsExports = {
	liftArray: new ArkLiftArray()
}

export type arkGenericsExports = typeof arkGenericsExports

export type arkGenerics = SchemaModule<arkGenericsExports>

const $ = schemaScope(arkGenericsExports)

export const arkGenerics: arkGenerics = $.export()
