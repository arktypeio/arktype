import { genericNode } from "@ark/schema"
import { Hkt, type Key, type omit, type pick, type show } from "@ark/util"
import type { Module } from "../module.js"
import { scope, type inferScope } from "../scope.js"
import { internalModule } from "./internal.js"
import { tsKeywordsModule } from "./tsKeywords.js"

class RecordHkt extends Hkt<[Key, unknown]> {
	declare body: Record<this[0], this[1]>
}

const Record = genericNode(["K", internalModule.key], "V")(
	args => ({
		domain: "object",
		index: {
			signature: args.K,
			value: args.V
		}
	}),
	RecordHkt
)

class PickHkt extends Hkt<[object, Key]> {
	declare body: pick<this[0], this[1] & keyof this[0]>
}

const Pick = genericNode(
	["T", tsKeywordsModule.object],
	["K", internalModule.key]
)(args => args.T.pick(args.K as never), PickHkt)

class OmitHkt extends Hkt<[object, Key]> {
	declare body: omit<this[0], this[1] & keyof this[0]>
}

const Omit = genericNode(
	["T", tsKeywordsModule.object],
	["K", internalModule.key]
)(args => args.T.omit(args.K as never), OmitHkt)

class PartialHkt extends Hkt<[object]> {
	declare body: show<Partial<this[0]>>
}

const Partial = genericNode(["T", tsKeywordsModule.object])(
	args => args.T.partial(),
	PartialHkt
)

class RequiredHkt extends Hkt<[object]> {
	declare body: show<Required<this[0]>>
}

const Required = genericNode(["T", tsKeywordsModule.object])(
	args => args.T.required(),
	RequiredHkt
)

class ExcludeHkt extends Hkt<[unknown, unknown]> {
	declare body: Exclude<this[0], this[1]>
}

const Exclude = genericNode("T", "U")(
	args => args.T.exclude(args.U),
	ExcludeHkt
)

class ExtractHkt extends Hkt<[unknown, unknown]> {
	declare body: Extract<this[0], this[1]>
}

const Extract = genericNode("T", "U")(
	args => args.T.extract(args.U),
	ExtractHkt
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

export type tsGenericsModule = Module<tsGenericsExports>

const $ = scope(tsGenericsExports, {
	prereducedAliases: true
})

export const tsGenericsModule: tsGenericsModule = $.export()
