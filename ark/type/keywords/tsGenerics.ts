import { genericNode } from "@ark/schema"
import { Hkt, type Key, type omit, type pick, type show } from "@ark/util"
import type { Module } from "../module.js"
import { scope, type inferScope } from "../scope.js"
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
	class RecordHkt extends Hkt<[Key, unknown]> {
		declare return: Record<this[0], this[1]>
	}
)

const Pick = genericNode(["T", tsKeywords.object], ["K", internal.key])(
	args => args.T.pick(args.K as never),
	class PickHkt extends Hkt<[object, Key]> {
		declare return: pick<this[0], this[1] & keyof this[0]>
	}
)

const Omit = genericNode(["T", tsKeywords.object], ["K", internal.key])(
	args => args.T.omit(args.K as never),
	class OmitHkt extends Hkt<[object, Key]> {
		declare return: omit<this[0], this[1] & keyof this[0]>
	}
)

const Partial = genericNode(["T", tsKeywords.object])(
	args => args.T.partial(),
	class PartialHkt extends Hkt<[object]> {
		declare return: show<Partial<this[0]>>
	}
)

const Required = genericNode(["T", tsKeywords.object])(
	args => args.T.required(),
	class RequiredHkt extends Hkt<[object]> {
		declare return: show<Required<this[0]>>
	}
)

const Exclude = genericNode("T", "U")(
	args => args.T.exclude(args.U),
	class ExcludeHkt extends Hkt<[unknown, unknown]> {
		declare return: Exclude<this[0], this[1]>
	}
)

const Extract = genericNode("T", "U")(
	args => args.T.extract(args.U),
	class ExtractHkt extends Hkt<[unknown, unknown]> {
		declare return: Extract<this[0], this[1]>
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

export type tsGenericsExports = inferScope<typeof tsGenericsExports>

export type tsGenerics = Module<tsGenericsExports>

const $ = scope(tsGenericsExports, {
	prereducedAliases: true
})

export const tsGenerics: tsGenerics = $.export()
