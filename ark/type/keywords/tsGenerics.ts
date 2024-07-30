import { generic, GenericHkt, type RootModule, schemaScope } from "@ark/schema"
import { $ark, type conform, type Key, type show } from "@ark/util"

const Record = generic(["K", $ark.intrinsic.propertyKey], "V")(
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

const Pick = generic(
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

const Omit = generic(
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

const Partial = generic(["T", $ark.intrinsic.object])(
	args => args.T.partial(),
	class PartialHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Partial<(typeof args)[0]>>
	}
)

const Required = generic(["T", $ark.intrinsic.object])(
	args => args.T.required(),
	class RequiredHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Required<(typeof args)[0]>>
	}
)

const Exclude = generic("T", "U")(
	args => args.T.exclude(args.U),
	class ExcludeHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown, unknown]>
		) => Exclude<(typeof args)[0], (typeof args)[1]>
	}
)

const Extract = generic("T", "U")(
	args => args.T.extract(args.U),
	class ExtractHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown, unknown]>
		) => Extract<(typeof args)[0], (typeof args)[1]>
	}
)

const tsGenericsExports = {
	Record,
	Pick,
	Omit,
	Exclude,
	Extract,
	Partial,
	Required
}

export type tsGenericsExports = typeof tsGenericsExports

export type tsGenerics = RootModule<tsGenericsExports>

const $ = schemaScope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
