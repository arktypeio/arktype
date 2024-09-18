import { genericNode, intrinsic, node } from "@ark/schema"
import {
	Hkt,
	type Json,
	type Key,
	type omit,
	type pick,
	type show
} from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import type { To } from "./inference.ts"
import { arkModule } from "./utils.ts"

export const arkTsKeywords: arkTsKeywords = arkModule({
	bigint: intrinsic.bigint,
	boolean: intrinsic.boolean,
	false: intrinsic.false,
	never: intrinsic.never,
	null: intrinsic.null,
	number: intrinsic.number,
	object: intrinsic.object,
	string: intrinsic.string,
	symbol: intrinsic.symbol,
	true: intrinsic.true,
	unknown: intrinsic.unknown,
	undefined: intrinsic.undefined
})

export type arkTsKeywords = Module<arkTsKeywords.$>

export declare namespace arkTsKeywords {
	export type submodule = Submodule<$>

	export type $ = {
		bigint: bigint
		boolean: boolean
		false: false
		never: never
		null: null
		number: number
		object: object
		string: string
		symbol: symbol
		true: true
		unknown: unknown
		undefined: undefined
	}
}

export const unknown = arkModule({
	root: intrinsic.unknown,
	any: intrinsic.unknown
})

export declare namespace unknown {
	export type submodule = Submodule<$>

	export type $ = {
		root: unknown
		any: any
	}
}

export const json = arkModule({
	root: intrinsic.json,
	stringify: node("morph", {
		in: intrinsic.json,
		morphs: (data: Json) => JSON.stringify(data),
		declaredOut: intrinsic.string
	})
})

export declare namespace json {
	export type submodule = Submodule<$>

	export type $ = {
		root: Json
		stringify: (In: Json) => To<string>
	}
}

export const object = arkModule({
	root: intrinsic.object,
	json
})

export declare namespace object {
	export type submodule = Submodule<$>

	export type $ = {
		root: object
		json: json.submodule
	}
}

class RecordHkt extends Hkt<[Key, unknown]> {
	declare body: Record<this[0], this[1]>
}

const Record = genericNode(["K", intrinsic.key], "V")(
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

const Pick = genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
	args => args.T.pick(args.K as never),
	PickHkt
)

class OmitHkt extends Hkt<[object, Key]> {
	declare body: omit<this[0], this[1] & keyof this[0]>
}

const Omit = genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
	args => args.T.omit(args.K as never),
	OmitHkt
)

class PartialHkt extends Hkt<[object]> {
	declare body: show<Partial<this[0]>>
}

const Partial = genericNode(["T", intrinsic.object])(
	args => args.T.partial(),
	PartialHkt
)

class RequiredHkt extends Hkt<[object]> {
	declare body: show<Required<this[0]>>
}

const Required = genericNode(["T", intrinsic.object])(
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

export const arkTsGenerics: arkTsGenerics.module = arkModule({
	Record,
	Pick,
	Omit,
	Exclude,
	Extract,
	Partial,
	Required
})

export declare namespace arkTsGenerics {
	export type module = Module<arkTsGenerics.$>

	export type submodule = Submodule<$>

	export type $ = {
		Record: typeof Record.t
		Pick: typeof Pick.t
		Omit: typeof Omit.t
		Exclude: typeof Exclude.t
		Extract: typeof Extract.t
		Partial: typeof Partial.t
		Required: typeof Required.t
	}
}
