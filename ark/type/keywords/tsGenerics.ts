import { GenericHkt, genericNode } from "@ark/schema"
import type { conform, Key, show } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { internal } from "./internal.js"
import { tsKeywords } from "./tsKeywords.js"

const Record = genericNode(["K", internal.key], "V")(
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

const Pick = genericNode(["T", tsKeywords.object], ["K", internal.key])(
	args => args.T.pick(args.K as never),
	class PickHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Pick<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const Omit = genericNode(["T", tsKeywords.object], ["K", internal.key])(
	args => args.T.omit(args.K as never),
	class OmitHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object, Key]>
		) => show<Omit<(typeof args)[0], (typeof args)[1] & keyof (typeof args)[0]>>
	}
)

const Partial = genericNode(["T", tsKeywords.object])(
	args => args.T.partial(),
	class PartialHkt extends GenericHkt {
		declare hkt: (
			args: conform<this["args"], [object]>
		) => show<Partial<(typeof args)[0]>>
	}
)

const Required = genericNode(["T", tsKeywords.object])(
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
