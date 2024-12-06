import {
	Disjoint,
	intersectNodesRoot,
	type BaseParseContext,
	type BaseRoot,
	type MetaSchema,
	type Morph,
	type Predicate
} from "@ark/schema"
import {
	objectKindOrDomainOf,
	throwParseError,
	type array,
	type BuiltinObjectKind,
	type conform,
	type Constructor,
	type Domain,
	type show
} from "@ark/util"
import type {
	distill,
	inferIntersection,
	inferMorphOut,
	inferPredicate,
	Out
} from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { PostfixExpression } from "./ast/infer.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import { writeMissingRightOperandMessage } from "./shift/operand/unenclosed.ts"
import type { ArkTypeScanner } from "./shift/scanner.ts"
import type { BaseCompletions } from "./string.ts"

export const maybeParseTupleExpression = (
	def: array,
	ctx: BaseParseContext
): BaseRoot | null =>
	isIndexZeroExpression(def) ? prefixParsers[def[0]](def as never, ctx)
	: isIndexOneExpression(def) ? indexOneParsers[def[1]](def as never, ctx)
	: null

export type maybeValidateTupleExpression<def extends array, $, args> =
	def extends IndexZeroExpression ? validatePrefixExpression<def, $, args>
	: def extends PostfixExpression ? validatePostfixExpression<def, $, args>
	: def extends InfixExpression ? validateInfixExpression<def, $, args>
	: def extends (
		readonly ["", ...unknown[]] | readonly [unknown, "", ...unknown[]]
	) ?
		readonly [
			def[0] extends "" ? BaseCompletions<$, args, IndexZeroOperator | "...">
			:	def[0],
			def[1] extends "" ? BaseCompletions<$, args, IndexOneOperator | "...">
			:	def[1]
		]
	:	null

export type inferTupleExpression<def extends TupleExpression, $, args> =
	def[1] extends "[]" ? inferDefinition<def[0], $, args>[]
	: def[1] extends "&" ?
		inferIntersection<
			inferDefinition<def[0], $, args>,
			inferDefinition<def[2], $, args>
		>
	: def[1] extends "|" ?
		inferDefinition<def[0], $, args> | inferDefinition<def[2], $, args>
	: def[1] extends ":" ?
		inferPredicate<inferDefinition<def[0], $, args>, def[2]>
	: def[1] extends "=>" ? parseMorph<def[0], def[2], $, args>
	: def[1] extends "@" ? inferDefinition<def[0], $, args>
	: def extends readonly ["===", ...infer values] ? values[number]
	: def extends (
		readonly ["instanceof", ...infer constructors extends Constructor[]]
	) ?
		InstanceType<constructors[number]>
	: def[0] extends "keyof" ? inferKeyOfExpression<def[1], $, args>
	: never

export type validatePrefixExpression<def extends IndexZeroExpression, $, args> =
	def["length"] extends 1 ? readonly [writeMissingRightOperandMessage<def[0]>]
	: def[0] extends "keyof" ?
		readonly [def[0], validateDefinition<def[1], $, args>]
	: def[0] extends "===" ? readonly [def[0], ...unknown[]]
	: def[0] extends "instanceof" ? readonly [def[0], ...Constructor[]]
	: never

export type validatePostfixExpression<
	def extends PostfixExpression,
	$,
	args
	// conform here is needed to preserve completions for shallow tuple
	// expressions at index 1 after TS 5.1
> = conform<def, readonly [validateDefinition<def[0], $, args>, "[]"]>

export type validateInfixExpression<def extends InfixExpression, $, args> =
	def["length"] extends 2 ?
		readonly [def[0], writeMissingRightOperandMessage<def[1]>]
	:	readonly [
			validateDefinition<def[0], $, args>,
			def[1],
			def[1] extends "|" ? validateDefinition<def[2], $, args>
			: def[1] extends "&" ? validateDefinition<def[2], $, args>
			: def[1] extends ":" ? Predicate<type.infer.Out<def[0], $, args>>
			: def[1] extends "=>" ? Morph<type.infer.Out<def[0], $, args>>
			: def[1] extends "@" ? MetaSchema
			: validateDefinition<def[2], $, args>
		]

export type UnparsedTupleExpressionInput = {
	instanceof: Constructor
	"===": unknown
}

export type UnparsedTupleOperator = show<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
	ctx.$.parseOwnDefinitionFormat(def[1], ctx).keyof()

export type inferKeyOfExpression<operandDef, $, args> = show<
	keyof inferDefinition<operandDef, $, args>
>

const parseBranchTuple: IndexOneParser<"|" | "&"> = (def, ctx) => {
	if (def[2] === undefined)
		return throwParseError(writeMissingRightOperandMessage(def[1], ""))

	const l = ctx.$.parseOwnDefinitionFormat(def[0], ctx)
	const r = ctx.$.parseOwnDefinitionFormat(def[2], ctx)
	if (def[1] === "|") return ctx.$.node("union", { branches: [l, r] })
	const result = intersectNodesRoot(l, r, ctx.$)
	if (result instanceof Disjoint) return result.throw()
	return result
}

const parseArrayTuple: IndexOneParser<"[]"> = (def, ctx) =>
	ctx.$.parseOwnDefinitionFormat(def[0], ctx).array()

export type IndexOneParser<token extends IndexOneOperator> = (
	def: IndexOneExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

export type PrefixParser<token extends IndexZeroOperator> = (
	def: IndexZeroExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | ":" | "@"

export type IndexOneExpression<
	token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: array): def is IndexOneExpression =>
	indexOneParsers[def[1] as IndexOneOperator] !== undefined

export const parseMorphTuple: IndexOneParser<"=>"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage("=>", def[2])
		)
	}
	return ctx.$.parseOwnDefinitionFormat(def[0], ctx).pipe(def[2] as Morph)
}

export const writeMalformedFunctionalExpressionMessage = (
	operator: ":" | "=>",
	value: unknown
): string =>
	`${
		operator === ":" ? "Narrow" : "Morph"
	} expression requires a function following '${operator}' (was ${typeof value})`

export type parseMorph<inDef, morph, $, args> =
	morph extends Morph ?
		inferMorphOut<morph> extends infer out ?
			(In: distill.In<inferDefinition<inDef, $, args>>) => Out<out>
		:	never
	:	never

export const parseNarrowTuple: IndexOneParser<":"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage(":", def[2])
		)
	}
	return ctx.$.parseOwnDefinitionFormat(def[0], ctx).constrain(
		"predicate",
		def[2] as Predicate
	)
}

const parseAttributeTuple: IndexOneParser<"@"> = (def, ctx) =>
	ctx.$.parseOwnDefinitionFormat(def[0], ctx).configureShallowDescendants(
		def[2] as never
	)

const indexOneParsers: {
	[token in IndexOneOperator]: IndexOneParser<token>
} = {
	"[]": parseArrayTuple,
	"|": parseBranchTuple,
	"&": parseBranchTuple,
	":": parseNarrowTuple,
	"=>": parseMorphTuple,
	"@": parseAttributeTuple
}

export type IndexZeroOperator = "keyof" | "instanceof" | "==="

export type IndexZeroExpression<
	token extends IndexZeroOperator = IndexZeroOperator
> = readonly [token, ...unknown[]]

export type InfixExpression = readonly [
	unknown,
	ArkTypeScanner.InfixToken,
	...unknown[]
]

const prefixParsers: {
	[token in IndexZeroOperator]: PrefixParser<token>
} = {
	keyof: parseKeyOfTuple,
	instanceof: (def, ctx) => {
		if (typeof def[1] !== "function") {
			return throwParseError(
				writeInvalidConstructorMessage(objectKindOrDomainOf(def[1]))
			)
		}
		const branches = def
			.slice(1)
			.map(ctor =>
				typeof ctor === "function" ?
					ctx.$.node("proto", { proto: ctor as Constructor })
				:	throwParseError(
						writeInvalidConstructorMessage(objectKindOrDomainOf(ctor))
					)
			)
		return branches.length === 1 ?
				branches[0]
			:	ctx.$.node("union", { branches })
	},
	"===": (def, ctx) => ctx.$.units(def.slice(1))
}

const isIndexZeroExpression = (def: array): def is IndexZeroExpression =>
	prefixParsers[def[0] as IndexZeroOperator] !== undefined

export const writeInvalidConstructorMessage = <
	actual extends Domain | BuiltinObjectKind
>(
	actual: actual
): string =>
	`Expected a constructor following 'instanceof' operator (was ${actual})`
