import {
	genericNode,
	intrinsic,
	isResolvable,
	node,
	normalizeIndex,
	rootSchemaScope,
	type BaseRoot
} from "@ark/schema"
import {
	cached,
	Hkt,
	throwParseError,
	type JsonStructure,
	type Key,
	type omit,
	type pick,
	type show,
	type Thunk
} from "@ark/util"
import type { required, To } from "../attributes.ts"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import { stringifyJson } from "./functions.ts"

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

export const arkTsKeywords: arkTsKeywords = /* @__PURE__ */ keywordModule(
	tsKeywordDefinitions,
	{ name: "ts" }
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

// Submodule under a name this file doesn't export, which a module's exports
// hold a nested module by: tsc writes it out as it does them. Held by
// Submodule itself, it would bind to a scope without the key its root is
// inferred by, as a module of a user's scope does
type nested<exports extends {}> = Submodule<exports>

// unexported, so emitted declarations write it out: see Submodule
type unknown$ = {
	root: unknown
	any: any
}

export declare namespace unknown {
	export type submodule = Submodule<$>

	export type $ = unknown$
}

export const json: Module<json.$> = keywordModule(
	{
		root: () => intrinsic.jsonObject,
		stringify: () =>
			node("morph", {
				morphs: [intrinsic.jsonObject, stringifyJson],
				declaredOut: intrinsic.string
			})
	},
	{
		name: "object.json"
	}
) as never

type json$ = {
	// only plain objects and arrays, so a primitive JSON value isn't one
	root: JsonStructure
	stringify: (In: JsonStructure) => To<string>
}

export declare namespace json {
	export type submodule = Submodule<$>

	export type $ = json$
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

type object$ = {
	root: object
	json: nested<json$>
}

export declare namespace object {
	export type submodule = Submodule<$>

	export type $ = object$
}

export class RecordHkt extends Hkt<[Key, unknown]> {
	declare body: Record<this[0], this[1]>
	// nominal, so no other Hkt is inferred as a Record
	declare private record: true

	description =
		'instantiate an object from an index signature and corresponding value type like `Record("string", "number")`'
}

const Record = cached(() =>
	genericNode(["K", intrinsic.key], "V")(
		// as TypeScript's Record and an object literal's index key, a literal
		// key is a required prop rather than an index signature
		args => ({
			domain: "object",
			...normalizeIndex(args.K as never, args.V, rootSchemaScope)
		}),
		RecordHkt
	)
)

export class PickHkt extends Hkt<[object, Key]> {
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

export class OmitHkt extends Hkt<[object, Key]> {
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

export class PartialHkt extends Hkt<[object]> {
	declare body: show<Partial<this[0]>>

	description =
		"make all named properties of an object optional like `Partial(User)`"
}

const Partial = cached(() =>
	genericNode(["T", intrinsic.object])(args => args.T.partial(), PartialHkt)
)

export class RequiredHkt extends Hkt<[object]> {
	declare body: show<required<this[0]>>

	description =
		"make all named properties of an object required like `Required(User)`"
}

const Required = cached(() =>
	genericNode(["T", intrinsic.object])(args => args.T.required(), RequiredHkt)
)

export class ExcludeHkt extends Hkt<[unknown, unknown]> {
	declare body: Exclude<this[0], this[1]>

	description = 'exclude branches of a union like `Exclude("boolean", "true")`'
}

const filterBranches = (
	operator: "Exclude" | "Extract",
	t: BaseRoot,
	u: BaseRoot
): BaseRoot =>
	!isResolvable(t) || !isResolvable(u) ?
		throwParseError(writeUnresolvedFilterMessage(operator))
	: operator === "Exclude" ? t.exclude(u)
	: t.extract(u)

const Exclude = cached(() =>
	genericNode("T", "U")(
		args => filterBranches("Exclude", args.T, args.U),
		ExcludeHkt
	)
)

export class ExtractHkt extends Hkt<[unknown, unknown]> {
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

export const arkTsGenerics: arkTsGenerics.module =
	/* @__PURE__ */ keywordModule(tsGenericDefinitions, {
		name: "ts.generics"
	}) as never

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

export const writeUnresolvedFilterMessage = <operator extends string>(
	operator: operator
): writeUnresolvedFilterMessage<operator> =>
	`${operator} can't filter a type still being defined`

export type writeUnresolvedFilterMessage<operator extends string> =
	`${operator} can't filter a type still being defined`
