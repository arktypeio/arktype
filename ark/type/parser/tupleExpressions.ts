import {
	Disjoint,
	type BaseParseContext,
	type BaseRoot,
	type Morph,
	type NodeSelector,
	type Predicate,
	type TypeMeta,
	type unwrapDefault
} from "@ark/schema"
import {
	hasOwn,
	objectKindOrDomainOf,
	throwParseError,
	type anyOrNever,
	type array,
	type BuiltinObjectKind,
	type Constructor,
	type Domain,
	type ErrorMessage,
	type show
} from "@ark/util"
import { intersectNodesRoot, pipeNodesRoot } from "arksets/internal"
import type {
	defaultFor,
	distill,
	inferIntersection,
	inferMorphOut,
	inferPipe,
	inferPredicate,
	InferredMorph,
	Out,
	withDefault
} from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import {
	shallowDefaultableMessage,
	shallowOptionalMessage
} from "./ast/validate.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import {
	checkWrittenIntersection,
	type BranchOperator
} from "./reduce/shared.ts"
import { writeMissingRightOperandMessage } from "./shift/operand/unenclosed.ts"
import type { InfixToken } from "./shift/tokens.ts"
import type { BaseCompletions } from "./string.ts"

export const maybeParseTupleExpression = (
	def: array,
	ctx: BaseParseContext
): BaseRoot | null =>
	isIndexZeroExpression(def) ? indexZeroParsers[def[0]](def as never, ctx)
	: isIndexOneExpression(def) ? indexOneParsers[def[1]](def as never, ctx)
	: null

export type maybeValidateTupleExpression<def extends array, $, args> =
	def extends IndexZeroExpression ? validatePrefixExpression<def, $, args>
	: def extends IndexOneExpression ? validateIndexOneExpression<def, $, args>
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
	: def[1] extends "?" ? inferDefinition<def[0], $, args>
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
	: def[1] extends "|>" ? parseTo<def[0], def[2], $, args>
	: def[1] extends "=" ?
		withDefault<inferDefinition<def[0], $, args>, unwrapDefault<def[2]>>
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

export type validateIndexOneExpression<
	def extends IndexOneExpression,
	$,
	args
> =
	def[1] extends TuplePostfixOperator ?
		// use type.validate here since optional/defaultables are not allowed
		// within tuple expressions
		readonly [validateDefinition<def[0], $, args>, def[1]]
	:	readonly [
			validateDefinition<def[0], $, args>,
			def["length"] extends 2 ? writeMissingRightOperandMessage<def[1]>
			:	def[1],
			def[1] extends "|" ? validateDefinition<def[2], $, args>
			: def[1] extends "&" ? validateDefinition<def[2], $, args>
			: def[1] extends ":" ?
				validatePredicate<
					inferDefinition<def[0], $, args>,
					type.infer.Out<def[0], $, args>
				>
			: def[1] extends "=>" ? Morph<type.infer.Out<def[0], $, args>>
			: def[1] extends "|>" ? validateDefinition<def[2], $, args>
			: def[1] extends "=" ? defaultFor<type.infer.In<def[0], $, args>>
			: def[1] extends "@" ? TypeMeta.MappableInput
			: validateDefinition<def[2], $, args>,
			...(def[1] extends "@" ? [NodeSelector?] : [])
		]

export type UnparsedTupleExpressionInput = {
	instanceof: Constructor
	"===": unknown
}

export type UnparsedTupleOperator = show<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: IndexZeroParser<"keyof"> = (def, ctx) =>
	ctx.$.parseOwn(def[1], ctx).keyof()

export type inferKeyOfExpression<operandDef, $, args> = show<
	keyof inferDefinition<operandDef, $, args>
>

const parseBranchTuple: IndexOneParser<BranchOperator> = (def, ctx) => {
	if (def[2] === undefined)
		return throwParseError(writeMissingRightOperandMessage(def[1], ""))

	const l = ctx.$.parseOwn(def[0], ctx)
	const r = ctx.$.parseOwn(def[2], ctx)
	if (def[1] === "|") return ctx.$.node("union", { branches: [l, r] })
	const result =
		def[1] === "&" ?
			intersectNodesRoot(l, r, ctx.$)
		:	pipeNodesRoot(l, r, ctx.$)
	if (result instanceof Disjoint) return result.throw()
	if (def[1] === "&") checkWrittenIntersection(result, l, r)
	return result
}

const parseArrayTuple: IndexOneParser<"[]"> = (def, ctx) =>
	ctx.$.parseOwn(def[0], ctx).rawArray()

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type ArgTwoOperator = Exclude<IndexOneOperator, "?" | "=">

export const parseMorphTuple: IndexOneParser<"=>"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage("=>", def[2])
		)
	}
	return ctx.$.parseOwn(def[0], ctx).pipe(def[2] as Morph)
}

export const writeMalformedFunctionalExpressionMessage = (
	operator: ":" | "=>",
	value: unknown
): string =>
	`${
		operator === ":" ? "Narrow" : "Morph"
	} expression requires a function following '${operator}' (was ${typeof value})`

export type parseTo<inDef, outDef, $, args> = inferPipe<
	inferDefinition<inDef, $, args>,
	inferDefinition<outDef, $, args>
>

export type parseMorph<inDef, morph, $, args> =
	morph extends Morph ?
		inferMorphOut<morph> extends infer out ?
			(In: distill.In<inferDefinition<inDef, $, args>>) => Out<out>
		:	never
	:	never

// a tuple's predicate constrains the whole root, so it can't follow a morph
export type validatePredicate<operand, data> =
	[operand] extends [anyOrNever] ? Predicate<data>
	: [operand] extends [InferredMorph] ? ErrorMessage<narrowedMorphMessage>
	: Predicate<data>

export type narrowedMorphMessage =
	"Predicate operand must be unknown (was a morph)"

export const parseNarrowTuple: IndexOneParser<":"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage(":", def[2])
		)
	}
	return ctx.$.parseOwn(def[0], ctx).rawConstrain(
		"predicate",
		def[2] as Predicate
	)
}

const parseMetaTuple: IndexOneParser<"@"> = (def, ctx) =>
	ctx.$.parseOwn(def[0], ctx).configure(def[2] as never, def[3] as NodeSelector)

export type IndexOneExpression<token extends string = IndexOneOperator> =
	readonly [unknown, token, ...unknown[]]

type IndexOneParser<token extends string> = (
	def: IndexOneExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

const defineIndexOneParsers = <parsers>(parsers: {
	[k in keyof parsers & string]: IndexOneParser<k>
}) => parsers

const postfixParsers = defineIndexOneParsers({
	"[]": parseArrayTuple,
	"?": () => throwParseError(shallowOptionalMessage)
})

export type TuplePostfixOperator = keyof typeof postfixParsers

const infixParsers = defineIndexOneParsers({
	"|": parseBranchTuple,
	"&": parseBranchTuple,
	":": parseNarrowTuple,
	"=>": parseMorphTuple,
	"|>": parseBranchTuple,
	"@": parseMetaTuple,
	// since object and tuple literals parse there via `parseProperty`,
	// they must be shallow if parsed directly as a tuple expression
	"=": () => throwParseError(shallowDefaultableMessage)
})

export type TupleInfixOperator = keyof typeof infixParsers

const indexOneParsers = { ...postfixParsers, ...infixParsers }

export type IndexOneOperator = keyof typeof indexOneParsers

const isIndexOneExpression = (def: array): def is IndexOneExpression =>
	isOperatorOf(def[1], indexOneParsers)

export type InfixExpression = readonly [unknown, InfixToken, ...unknown[]]

type IndexZeroParser<token extends string> = (
	def: IndexZeroExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

type IndexZeroExpression<token extends string = IndexZeroOperator> = readonly [
	token,
	...unknown[]
]

const defineIndexZeroParsers = <parsers>(parsers: {
	[k in keyof parsers & string]: IndexZeroParser<k>
}) => parsers

const indexZeroParsers = defineIndexZeroParsers({
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
})

export type IndexZeroOperator = keyof typeof indexZeroParsers

const isIndexZeroExpression = (def: array): def is IndexZeroExpression =>
	isOperatorOf(def[0], indexZeroParsers)

// a non-string element could run user code if coerced to a property key
const isOperatorOf = (element: unknown, parsers: object) =>
	typeof element === "string" && hasOwn(parsers, element)

export const writeInvalidConstructorMessage = <
	actual extends Domain | BuiltinObjectKind
>(
	actual: actual
): string =>
	`Expected a constructor following 'instanceof' operator (was ${actual})`
