import { GenericHkt, genericNode } from "@ark/schema"
import { $ark, type conform, type Key, type show } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"

const Record = genericNode(["K", $ark.intrinsic.propertyKey], "V")(
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

const Pick = genericNode(
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

const Omit = genericNode(
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

const Partial = genericNode(["T", $ark.intrinsic.object])(
	args => args.T.partial(),
	class PartialHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Partial<(typeof args)[0]>>
	}
)

const Required = genericNode(["T", $ark.intrinsic.object])(
	args => args.T.required(),
	class RequiredHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Required<(typeof args)[0]>>
	}
)

const Exclude = genericNode("T", "U")(
	args => args.T.exclude(args.U),
	class ExcludeHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [unknown, unknown]>
		) => Exclude<(typeof args)[0], (typeof args)[1]>
	}
)

const Extract = genericNode("T", "U")(
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

export type tsGenerics = Module<tsGenericsExports>

const $ = scope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
