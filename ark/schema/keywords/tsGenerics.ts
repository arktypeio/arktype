import { $ark, type conform, type Key, type show } from "@ark/util"
import { GenericHkt } from "../generic.js"
import type { SchemaModule } from "../module.js"
import { generic, schemaScope } from "../scope.js"

const ArkRecord = generic(["K", $ark.intrinsic.propertyKey], "V")(
	args => ({
		domain: "object",
		index: {
			signature: args.K,
			value: args.V
		}
	}),
	class RecordHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [PropertyKey, unknown]>
		) => Record<(typeof args)[0], (typeof args)[1]>
	}
)

const ArkPick = generic(
	["T", $ark.intrinsic.object],
	["K", $ark.intrinsic.propertyKey]
)(
	args => args.T.pick(args.K as never),
	class PickHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Pick<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const ArkOmit = generic(
	["T", $ark.intrinsic.object],
	["K", $ark.intrinsic.propertyKey]
)(
	args => args.T.omit(args.K as never),
	class OmitHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Omit<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const ArkExclude = generic("T", "U")(
	args => args.T.exclude(args.U),
	class ExcludeHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown, unknown]>
		) => Exclude<(typeof args)[0], (typeof args)[1]>
	}
)

const ArkExtract = generic("T", "U")(
	args => args.T.extract(args.U),
	class ExtractHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown, unknown]>
		) => Extract<(typeof args)[0], (typeof args)[1]>
	}
)

const tsGenericsExports = {
	Record: ArkRecord,
	Pick: ArkPick,
	Omit: ArkOmit,
	Exclude: ArkExclude,
	Extract: ArkExtract
}

export type tsGenericsExports = typeof tsGenericsExports

export type tsGenerics = SchemaModule<tsGenericsExports>

const $ = schemaScope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
