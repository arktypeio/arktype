import {
	$ark,
	liftArray,
	type conform,
	type Hkt,
	type Key,
	type show
} from "@ark/util"
import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { generic, schemaScope } from "../scope.js"

class ArkRecord extends generic(
	["K", $ark.intrinsic.propertyKey],
	"V"
)(args => ({
	domain: "object",
	index: {
		signature: args.K,
		value: args.V
	}
})) {
	declare hkt: (
		args: conform<this[Hkt.args], [PropertyKey, unknown]>
	) => Record<(typeof args)[0], (typeof args)[1]>
}

class ArkPick extends generic(
	["T", $ark.intrinsic.object],
	["K", $ark.intrinsic.propertyKey]
)(args => args.T.pick(args.K as never)) {
	declare hkt: (
		args: conform<this[Hkt.args], [object, Key]>
	) => show<Pick<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
}

class ArkOmit extends generic(
	["T", $ark.intrinsic.object],
	["K", $ark.intrinsic.propertyKey]
)(args => args.T.omit(args.K as never)) {
	declare hkt: (
		args: conform<this[Hkt.args], [object, Key]>
	) => show<Omit<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
}

class ArkExclude extends generic("T", "U")(args => args.T.exclude(args.U)) {
	declare hkt: (
		args: conform<this[Hkt.args], [unknown, unknown]>
	) => Exclude<(typeof args)[0], (typeof args)[1]>
}

class ArkExtract extends generic("T", "U")(args => args.T.extract(args.U)) {
	declare hkt: (
		args: conform<this[Hkt.args], [unknown, unknown]>
	) => Extract<(typeof args)[0], (typeof args)[1]>
}

class ArkLiftArray extends generic("T")(args =>
	args.T.or(args.T.array()).pipe(liftArray)
) {
	declare hkt: (
		args: conform<this[Hkt.args], [unknown]>
	) => liftArray<(typeof args)[0]> extends infer lifted ?
		(In: (typeof args)[0] | lifted) => Out<lifted>
	:	never
}

const tsGenericsExports = {
	Record: new ArkRecord(),
	Pick: new ArkPick(),
	Omit: new ArkOmit(),
	Exclude: new ArkExclude(),
	Extract: new ArkExtract(),
	liftArray: new ArkLiftArray()
}

export type tsGenericsExports = typeof tsGenericsExports

export type tsGenerics = SchemaModule<tsGenericsExports>

const $ = schemaScope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
