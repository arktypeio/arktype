import type { DescribeOptions } from "./describe.js"
import type { conformOrDefault, show } from "./generics.js"
import type { stringifyUnion } from "./unionToTuple.js"

export const hasDomain = <data, domain extends Domain>(
	data: data,
	kind: domain
): data is data & inferDomain<domain> => domainOf(data as any) === kind

type TypesByDomain = {
	bigint: bigint
	boolean: boolean
	number: number
	object: object
	string: string
	symbol: symbol
	undefined: undefined
	null: null
}

export type inferDomain<kind extends Domain> =
	Domain extends kind ? unknown : TypesByDomain[kind]

export type Domain = show<keyof TypesByDomain>

export type NullishDomain = "undefined" | "null"

export type NonNullishDomain = Exclude<Domain, NullishDomain>

export type PrimitiveDomain = Exclude<Domain, "object">

export type Primitive = inferDomain<PrimitiveDomain>

export type domainOf<data> =
	unknown extends data ? Domain
	: data extends object ? "object"
	: data extends string ? "string"
	: data extends number ? "number"
	: data extends boolean ? "boolean"
	: data extends undefined ? "undefined"
	: data extends null ? "null"
	: data extends bigint ? "bigint"
	: data extends symbol ? "symbol"
	: never

export const domainOf = <data>(data: data): domainOf<data> => {
	const builtinType = typeof data
	return (
		builtinType === "object" ?
			data === null ?
				"null"
			:	"object"
		: builtinType === "function" ? "object"
		: builtinType) as domainOf<data>
}

const enumerableDomainDescriptions = {
	boolean: "boolean",
	null: "null",
	undefined: "undefined"
} as const

const nonEnumerableDomainDescriptions = {
	bigint: "a bigint",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol"
} as const

export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

/** Each domain's completion for the phrase "must be _____" */
export const domainDescriptions = {
	...nonEnumerableDomainDescriptions,
	...enumerableDomainDescriptions
} satisfies Record<Domain, string>

export type domainDescriptions = typeof domainDescriptions

export type describeDomainOf<
	t,
	opts extends DescribeOptions = {}
> = stringifyUnion<
	opts["excludeArticles"] extends true ? domainOf<t>
	:	domainDescriptions[domainOf<t>],
	conformOrDefault<opts["branchDelimiter"], string, " or ">
>
