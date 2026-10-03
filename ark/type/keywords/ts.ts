import {
	genericNode,
	identityOf,
	intrinsic,
	isResolvable,
	node,
	resolveShallowAliases,
	type BaseRoot
} from "@ark/schema"
import {
	cached,
	Hkt,
	type Json,
	type Key,
	type omit,
	type pick,
	type show,
	type Thunk
} from "@ark/util"
import type { To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"

export const tsKeywordDefinitions: Record<
	keyof arkTsKeywords.$,
	Thunk<BaseRoot>
> = {
	bigint: () => intrinsic.bigint,
	boolean: () => intrinsic.boolean,
	false: () => intrinsic.false,
	never: () => intrinsic.never,
	null: () => intrinsic.null,
	number: () => intrinsic.number,
	object: () => intrinsic.object,
	string: () => intrinsic.string,
	symbol: () => intrinsic.symbol,
	true: () => intrinsic.true,
	unknown: () => intrinsic.unknown,
	undefined: () => intrinsic.undefined
}

export const arkTsKeywords: arkTsKeywords = keywordModule(
	tsKeywordDefinitions
) as never

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

export const unknown: Module<unknown.$> = keywordModule(
	{
		root: () => intrinsic.unknown,
		any: () => intrinsic.unknown
	},
	{
		name: "unknown"
	}
) as never

export declare namespace unknown {
	export type submodule = Submodule<$>

	export type $ = {
		root: unknown
		any: any
	}
}

export const json: Module<json.$> = keywordModule(
	{
		root: () => intrinsic.jsonObject,
		stringify: () =>
			node("morph", {
				in: intrinsic.jsonObject,
				morphs: (data: Json) => JSON.stringify(data),
				declaredOut: intrinsic.string
			})
	},
	{
		name: "object.json"
	}
) as never

export declare namespace json {
	export type submodule = Submodule<$>

	export type $ = {
		root: Json
		stringify: (In: Json) => To<string>
	}
}

export const object: Module<object.$> = keywordModule(
	{
		root: () => intrinsic.object,
		json
	},
	{
		name: "object"
	}
) as never

export declare namespace object {
	export type submodule = Submodule<$>

	export type $ = {
		root: object
		json: json.submodule
	}
}

class RecordHkt extends Hkt<[Key, unknown]> {
	declare body: Record<this[0], this[1]>

	description =
		'instantiate an object from an index signature and corresponding value type like `Record("string", "number")`'
}

const Record = cached(() =>
	genericNode(["K", intrinsic.key], "V")(
		args => ({
			domain: "object",
			index: {
				signature: args.K,
				value: args.V
			}
		}),
		RecordHkt
	)
)

class PickHkt extends Hkt<[object, Key]> {
	declare body: pick<this[0], this[1] & keyof this[0]>

	description =
		'pick a set of properties from an object like `Pick(User, "name | age")`'
}

const Pick = cached(() =>
	genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
		args => args.T.pick(args.K as never),
		PickHkt
	)
)

class OmitHkt extends Hkt<[object, Key]> {
	declare body: omit<this[0], this[1] & keyof this[0]>

	description =
		'omit a set of properties from an object like `Omit(User, "age")`'
}

const Omit = cached(() =>
	genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
		args => args.T.omit(args.K as never),
		OmitHkt
	)
)

class PartialHkt extends Hkt<[object]> {
	declare body: show<Partial<this[0]>>

	description =
		"make all named properties of an object optional like `Partial(User)`"
}

const Partial = cached(() =>
	genericNode(["T", intrinsic.object])(args => args.T.partial(), PartialHkt)
)

class RequiredHkt extends Hkt<[object]> {
	declare body: show<Required<this[0]>>

	description =
		"make all named properties of an object required like `Required(User)`"
}

const Required = cached(() =>
	genericNode(["T", intrinsic.object])(args => args.T.required(), RequiredHkt)
)

class ExcludeHkt extends Hkt<[unknown, unknown]> {
	declare body: Exclude<this[0], this[1]>

	description = 'exclude branches of a union like `Exclude("boolean", "true")`'
}

// a branch still being defined can't be related, so filtering it waits as an alias until it resolves
const filterBranches = (
	operator: "Exclude" | "Extract",
	t: BaseRoot,
	u: BaseRoot
): BaseRoot => {
	const filter = (t: BaseRoot, u: BaseRoot) =>
		operator === "Exclude" ? t.exclude(u) : t.extract(u)
	if (isResolvable(t) && isResolvable(u)) return filter(t, u)
	return t.$.lazilyResolve(
		() => filter(resolveShallowAliases(t), resolveShallowAliases(u)),
		`${operator}<${identityOf(t)},${identityOf(u)}>`,
		operator,
		[t, u]
	)
}

const Exclude = cached(() =>
	genericNode("T", "U")(
		args => filterBranches("Exclude", args.T, args.U),
		ExcludeHkt
	)
)

class ExtractHkt extends Hkt<[unknown, unknown]> {
	declare body: Extract<this[0], this[1]>

	description =
		'extract branches of a union like `Extract("0 | false | 1", "number")`'
}

const Extract = cached(() =>
	genericNode("T", "U")(
		args => filterBranches("Extract", args.T, args.U),
		ExtractHkt
	)
)

export const tsGenericDefinitions = {
	Exclude,
	Extract,
	Omit,
	Partial,
	Pick,
	Record,
	Required
}

export const arkTsGenerics: arkTsGenerics.module = keywordModule(
	tsGenericDefinitions
) as never

export declare namespace arkTsGenerics {
	export type module = Module<arkTsGenerics.$>

	export type submodule = Submodule<$>

	export type $ = {
		Exclude: ReturnType<typeof Exclude>["t"]
		Extract: ReturnType<typeof Extract>["t"]
		Omit: ReturnType<typeof Omit>["t"]
		Partial: ReturnType<typeof Partial>["t"]
		Pick: ReturnType<typeof Pick>["t"]
		Record: ReturnType<typeof Record>["t"]
		Required: ReturnType<typeof Required>["t"]
	}
}
