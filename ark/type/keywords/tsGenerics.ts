import { GenericHkt } from "@ark/schema"
import type { conform, Key, show } from "@ark/util"
import { generic } from "../ark.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { internal } from "./internal.js"
import { tsKeywords } from "./tsKeywords.js"

const Record = generic(["K", internal.propertyKey], "V")(
	args => ({
		domain: "object",
		index: {
			signature: args.K,
			value: args.V
		}
	}),
	class RecordHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [Key, unknown]>
		) => Record<(typeof args)[0], (typeof args)[1]>
	}
)

const Pick = generic(["T", tsKeywords.object], ["K", internal.propertyKey])(
	args => args.T.pick(args.K as never),
	class PickHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Pick<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const Omit = generic(["T", tsKeywords.object], ["K", internal.propertyKey])(
	args => args.T.omit(args.K as never),
	class OmitHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Omit<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const Partial = generic(["T", tsKeywords.object])(
	args => args.T.partial(),
	class PartialHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Partial<(typeof args)[0]>>
	}
)

const Required = generic(["T", tsKeywords.object])(
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

export type tsGenerics = Module<tsGenericsExports>

const $ = scope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
