import {
	$ark,
	Disjoint,
	intersectNodesRoot,
	makeRootAndArrayPropertiesMutable,
	type BaseParseContext,
	type BaseRoot,
	type MetaSchema,
	type Morph,
	type mutableInnerOfKind,
	type nodeOfKind,
	type Predicate,
	type Union
} from "@ark/schema"
import {
	append,
	isEmptyObject,
	objectKindOrDomainOf,
	throwParseError,
	type anyOrNever,
	type array,
	type BuiltinObjectKind,
	type conform,
	type Constructor,
	type Domain,
	type ErrorMessage,
	type show
} from "@ark/util"
import type {
	distill,
	inferIntersection,
	inferMorphOut,
	inferPredicate,
	InferredOptional,
	Out
} from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { PostfixExpression } from "./ast/infer.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import { writeMissingRightOperandMessage } from "./shift/operand/unenclosed.ts"
import type { ArkTypeScanner } from "./shift/scanner.ts"
import type { BaseCompletions } from "./string.ts"

export const parseTuple = (def: array, ctx: BaseParseContext): BaseRoot =>
	maybeParseTupleExpression(def, ctx) ?? parseTupleLiteral(def, ctx)

export const parseTupleLiteral = (
	def: array,
	ctx: BaseParseContext
): BaseRoot => {
	let sequences: mutableInnerOfKind<"sequence">[] = [{}]
	let i = 0
	while (i < def.length) {
		let spread = false
		if (def[i] === "..." && i < def.length - 1) {
			spread = true
			i++
		}

		const element = ctx.$.parseOwnDefinitionFormat(def[i], ctx)

		i++
		if (spread) {
			if (!element.extends($ark.intrinsic.Array))
				return throwParseError(writeNonArraySpreadMessage(element.expression))

			// a spread must be distributed over branches e.g.:
			// def: [string, ...(number[] | [true, false])]
			// nodes: [string, ...number[]] | [string, true, false]
			sequences = sequences.flatMap(base =>
				// since appendElement mutates base, we have to shallow-ish clone it for each branch
				element.distribute(branch =>
					appendSpreadBranch(makeRootAndArrayPropertiesMutable(base), branch)
				)
			)
		} else {
			sequences = sequences.map(base =>
				appendElement(
					base,
					element.meta.optional ? "optional" : "required",
					element
				)
			)
		}
	}
	return ctx.$.parseSchema(
		sequences.map(sequence =>
			isEmptyObject(sequence) ?
				{
					proto: Array,
					exactLength: 0
				}
			:	({
					proto: Array,
					sequence
				} as const)
		)
	)
}

type ElementKind = "optional" | "required" | "variadic"

const appendElement = (
	base: mutableInnerOfKind<"sequence">,
	kind: ElementKind,
	element: BaseRoot
): mutableInnerOfKind<"sequence"> => {
	switch (kind) {
		case "required":
			if (base.optionals)
				// e.g. [string?, number]
				return throwParseError(requiredPostOptionalMessage)
			if (base.variadic) {
				// e.g. [...string[], number]
				base.postfix = append(base.postfix, element)
			} else {
				// e.g. [string, number]
				base.prefix = append(base.prefix, element)
			}
			return base
		case "optional":
			if (base.variadic)
				// e.g. [...string[], number?]
				return throwParseError(optionalPostVariadicMessage)
			// e.g. [string, number?]
			base.optionals = append(base.optionals, element)
			return base
		case "variadic":
			// e.g. [...string[], number, ...string[]]
			if (base.postfix) throwParseError(multipleVariadicMesage)
			if (base.variadic) {
				if (!base.variadic.equals(element)) {
					// e.g. [...string[], ...number[]]
					throwParseError(multipleVariadicMesage)
				}
				// e.g. [...string[], ...string[]]
				// do nothing, second spread doesn't change the type
			} else {
				// e.g. [string, ...number[]]
				base.variadic = element.internal
			}
			return base
	}
}

const appendSpreadBranch = (
	base: mutableInnerOfKind<"sequence">,
	branch: nodeOfKind<Union.ChildKind>
): mutableInnerOfKind<"sequence"> => {
	const spread = branch.firstReferenceOfKind("sequence")
	if (!spread) {
		// the only array with no sequence reference is unknown[]
		return appendElement(base, "variadic", $ark.intrinsic.unknown)
	}
	spread.prefix?.forEach(node => appendElement(base, "required", node))
	spread.optionals?.forEach(node => appendElement(base, "optional", node))
	if (spread.variadic) appendElement(base, "variadic", spread.variadic)
	spread.postfix?.forEach(node => appendElement(base, "required", node))
	return base
}

const maybeParseTupleExpression = (
	def: array,
	ctx: BaseParseContext
): BaseRoot | undefined => {
	const tupleExpressionResult =
		isIndexZeroExpression(def) ? prefixParsers[def[0]](def as never, ctx)
		: isIndexOneExpression(def) ? indexOneParsers[def[1]](def as never, ctx)
		: undefined
	return tupleExpressionResult
}

// It is *extremely* important we use readonly any time we check a tuple against
// something like this. Not doing so will always cause the check to fail, since
// def is declared as a const parameter.
type InfixExpression = readonly [
	unknown,
	ArkTypeScanner.InfixToken,
	...unknown[]
]

export type validateTuple<def extends array, $, args> =
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
	:	validateTupleLiteral<def, $, args>

export type validateTupleLiteral<def extends array, $, args> =
	parseSequence<def, $, args> extends infer s extends SequenceParseState ?
		Readonly<s["validated"]>
	:	never

type inferTupleLiteral<def extends array, $, args> =
	parseSequence<def, $, args> extends infer s extends SequenceParseState ?
		s["inferred"]
	:	never

type SequenceParseState = {
	unscanned: array
	inferred: array
	validated: array
	includesOptional: boolean
}

type parseSequence<def extends array, $, args> = parseNextElement<
	{
		unscanned: def
		inferred: []
		validated: []
		includesOptional: false
	},
	$,
	args
>

type PreparsedElement = {
	head: unknown
	tail: array
	inferred: unknown
	optional: boolean
	spread: boolean
}

declare namespace PreparsedElement {
	export type from<result extends PreparsedElement> = result
}

type preparseNextElement<s extends SequenceParseState, $, args> =
	s["unscanned"] extends readonly ["...", infer head, ...infer tail] ?
		inferDefinition<head, $, args> extends infer t ?
			[t] extends [anyOrNever] ?
				PreparsedElement.from<{
					head: head
					tail: tail
					inferred: t
					optional: false
					spread: true
				}>
			: [t] extends [InferredOptional<infer base>] ?
				PreparsedElement.from<{
					head: head
					tail: tail
					inferred: base
					// this will be an error we have to handle
					optional: true
					spread: true
				}>
			:	PreparsedElement.from<{
					head: head
					tail: tail
					inferred: t
					optional: false
					spread: true
				}>
		:	never
	: s["unscanned"] extends readonly [infer head, ...infer tail] ?
		inferDefinition<head, $, args> extends infer t ?
			[t] extends [anyOrNever] ?
				PreparsedElement.from<{
					head: head
					tail: tail
					inferred: t
					optional: false
					spread: false
				}>
			: [t] extends [InferredOptional<infer base>] ?
				PreparsedElement.from<{
					head: head
					tail: tail
					inferred: base
					optional: true
					spread: false
				}>
			:	PreparsedElement.from<{
					head: head
					tail: tail
					inferred: t
					optional: false
					spread: false
				}>
		:	never
	:	null

type parseNextElement<s extends SequenceParseState, $, args> =
	preparseNextElement<s, $, args> extends infer next extends PreparsedElement ?
		parseNextElement<
			{
				unscanned: next["tail"]
				inferred: next["spread"] extends true ?
					[...s["inferred"], ...conform<next["inferred"], array>]
				: next["optional"] extends true ? [...s["inferred"], next["inferred"]?]
				: [...s["inferred"], next["inferred"]]
				validated: [
					...s["validated"],
					...(next["spread"] extends true ?
						[
							next["inferred"] extends infer spreadOperand extends array ?
								[number, number] extends (
									[s["inferred"]["length"], spreadOperand["length"]]
								) ?
									ErrorMessage<multipleVariadicMessage>
								:	"..."
							:	ErrorMessage<writeNonArraySpreadMessage<next["head"]>>
						]
					:	[]),
					next["optional"] extends true ?
						next["spread"] extends true ? ErrorMessage<spreadOptionalMessage>
						: number extends s["inferred"]["length"] ?
							ErrorMessage<optionalPostVariadicMessage>
						:	validateDefinition<next["head"], $, args>
					: [s["includesOptional"], next["spread"]] extends [true, false] ?
						ErrorMessage<requiredPostOptionalMessage>
					:	validateDefinition<next["head"], $, args>
				]
				includesOptional: s["includesOptional"] | next["optional"] extends (
					false
				) ?
					false
				:	true
			},
			$,
			args
		>
	:	s

export const writeNonArraySpreadMessage = <operand extends string>(
	operand: operand
): writeNonArraySpreadMessage<operand> =>
	`Spread element must be an array (was ${operand})` as never

type writeNonArraySpreadMessage<operand> =
	`Spread element must be an array${operand extends string ? ` (was ${operand})`
	:	""}`

export const multipleVariadicMesage =
	"A tuple may have at most one variadic element"

type multipleVariadicMessage = typeof multipleVariadicMesage

export const requiredPostOptionalMessage =
	"A required element may not follow an optional element"

type requiredPostOptionalMessage = typeof requiredPostOptionalMessage

export const optionalPostVariadicMessage =
	"An optional element may not follow a variadic element"

type optionalPostVariadicMessage = typeof optionalPostVariadicMessage

export const spreadOptionalMessage = "A spread element cannot be optional"

type spreadOptionalMessage = typeof optionalPostVariadicMessage

export type inferTuple<def extends array, $, args> =
	def extends TupleExpression ? inferTupleExpression<def, $, args>
	:	inferTupleLiteral<def, $, args>

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
