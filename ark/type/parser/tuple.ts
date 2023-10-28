import type {
	BaseAttributes,
	inferMorphOut,
	inferNarrow,
	Morph,
	Predicate,
	Root
} from "@arktype/schema"
import { builtins, node } from "@arktype/schema"
import type {
	AbstractableConstructor,
	BuiltinObjectKind,
	conform,
	Domain,
	evaluate,
	isAny,
	List
} from "@arktype/util"
import {
	domainOf,
	isArray,
	objectKindOf,
	stringify,
	throwParseError
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { extractIn, extractOut } from "../type.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { inferIntersection } from "./semantic/intersections.js"
import {
	type InfixOperator,
	type PostfixExpression
} from "./semantic/semantic.js"
import { writeUnsatisfiableExpressionError } from "./semantic/validate.js"
import type { EntryParseResult, validateObjectValue } from "./shared.js"
import { parseEntry } from "./shared.js"
import { writeMissingRightOperandMessage } from "./string/shift/operand/unenclosed.js"
import type { BaseCompletions } from "./string/string.js"

export const parseTuple = (def: List, ctx: ParseContext) =>
	maybeParseTupleExpression(def, ctx) ?? parseTupleLiteral(def, ctx)

export const parseTupleLiteral = (def: List, ctx: ParseContext): Root => {
	const props: unknown[] = []
	let isVariadic = false
	for (let i = 0; i < def.length; i++) {
		let elementDef = def[i]
		ctx.path.push(`${i}`)
		if (typeof elementDef === "string" && elementDef.startsWith("...")) {
			elementDef = elementDef.slice(3)
			isVariadic = true
		} else if (
			isArray(elementDef) &&
			elementDef.length === 2 &&
			elementDef[0] === "..."
		) {
			elementDef = elementDef[1]
			isVariadic = true
		}
		const parsedEntry = parseEntry([`${i}`, elementDef])
		const value = ctx.scope.parse(parsedEntry.innerValue, ctx)
		if (isVariadic) {
			if (!value.extends(builtins.array())) {
				return throwParseError(writeNonArrayRestMessage(elementDef))
			}
			if (i !== def.length - 1) {
				return throwParseError(prematureRestMessage)
			}
			// TODO: Fix builtins.arrayIndexTypeNode()
			const elementType = value.getPath()
			// TODO: first variadic i
			props.push({ key: builtins.arrayIndexTypeNode(), value: elementType })
		} else {
			props.push({
				key: {
					name: `${i}`,
					prerequisite: false,
					optional: parsedEntry.kind === "optional"
				},
				value
			})
		}
		ctx.path.pop()
	}
	if (!isVariadic) {
		props.push({
			key: {
				name: "length",
				prerequisite: true,
				optional: false
			},
			// , ctx
			value: node({ is: def.length })
		})
	}
	//  props , ctx
	return node(Array)
}

export const maybeParseTupleExpression = (
	def: List,
	ctx: ParseContext
): Root | undefined => {
	const tupleExpressionResult = isIndexOneExpression(def)
		? indexOneParsers[def[1]](def as never, ctx)
		: isIndexZeroExpression(def)
		? prefixParsers[def[0]](def as never, ctx)
		: undefined
	if (tupleExpressionResult) {
		return tupleExpressionResult.isNever()
			? throwParseError(
					writeUnsatisfiableExpressionError(
						def
							.map((def) => (typeof def === "string" ? def : stringify(def)))
							.join(" ")
					)
			  )
			: tupleExpressionResult
	}
}

// It is *extremely* important we use readonly any time we check a tuple against
// something like this. Not doing so will always cause the check to fail, since
// def is declared as a const parameter.
type InfixExpression = readonly [unknown, InfixOperator, ...unknown[]]

export type validateTuple<
	def extends List,
	$,
	args
> = def extends IndexZeroExpression
	? validatePrefixExpression<def, $, args>
	: def extends PostfixExpression
	? validatePostfixExpression<def, $, args>
	: def extends InfixExpression
	? validateInfixExpression<def, $, args>
	: def extends
			| readonly ["", ...unknown[]]
			| readonly [unknown, "", ...unknown[]]
	? readonly [
			def[0] extends "" ? BaseCompletions<$, args, IndexZeroOperator> : def[0],
			def[1] extends "" ? BaseCompletions<$, args, IndexOneOperator> : def[1]
	  ]
	: validateTupleLiteral<def, $, args>

export type validateTupleLiteral<
	def extends List,
	$,
	args,
	result extends unknown[] = []
> = def extends readonly [infer head, ...infer tail]
	? validateTupleLiteral<
			tail,
			$,
			args,
			[...result, validateTupleElement<head, tail, $, args>]
	  >
	: result

type validateTupleElement<head, tail, $, args> =
	head extends variadicExpression<infer operand>
		? validateDefinition<operand, $, args> extends infer syntacticResult
			? syntacticResult extends operand
				? semanticallyValidateRestElement<
						operand,
						$,
						args
				  > extends infer semanticResult
					? semanticResult extends operand
						? tail extends []
							? head
							: prematureRestMessage
						: semanticResult
					: never
				: syntacticResult
			: never
		: validateObjectValue<head, $, args>

type semanticallyValidateRestElement<operand, $, args> = inferDefinition<
	operand,
	$,
	args
> extends infer result
	? result extends never
		? writeNonArrayRestMessage<operand>
		: isAny<result> extends true
		? writeNonArrayRestMessage<operand>
		: result extends readonly unknown[]
		? operand
		: writeNonArrayRestMessage<operand>
	: never

export const writeNonArrayRestMessage = <operand>(operand: operand) =>
	`Rest element ${
		typeof operand === "string" ? `'${operand}'` : ""
	} must be an array` as writeNonArrayRestMessage<operand>

type writeNonArrayRestMessage<operand> = `Rest element ${operand extends string
	? `'${operand}'`
	: ""} must be an array`

export const prematureRestMessage = `Rest elements are only allowed at the end of a tuple`

type prematureRestMessage = typeof prematureRestMessage

type inferTupleLiteral<
	def extends List,
	$,
	args,
	result extends unknown[] = []
> = def extends readonly [infer head, ...infer tail]
	? parseEntry<
			result["length"],
			head extends variadicExpression<infer operand> ? operand : head
	  > extends infer entryParseResult extends EntryParseResult
		? inferDefinition<
				entryParseResult["innerValue"],
				$,
				args
		  > extends infer element
			? head extends variadicExpression
				? element extends readonly unknown[]
					? inferTupleLiteral<tail, $, args, [...result, ...element]>
					: never
				: inferTupleLiteral<
						tail,
						$,
						args,
						entryParseResult["kind"] extends "optional"
							? [...result, element?]
							: [...result, element]
				  >
			: never
		: never
	: result

type variadicExpression<operandDef = unknown> =
	| variadicStringExpression<operandDef & string>
	| variadicTupleExpression<operandDef>

type variadicStringExpression<operandDef extends string = string> =
	`...${operandDef}`

type variadicTupleExpression<operandDef = unknown> = readonly [
	"...",
	operandDef
]

export type inferTuple<def extends List, $, args> = def extends TupleExpression
	? inferTupleExpression<def, $, args>
	: inferTupleLiteral<def, $, args>

export type inferTupleExpression<
	def extends TupleExpression,
	$,
	args
> = def[1] extends "[]"
	? inferDefinition<def[0], $, args>[]
	: def[1] extends "&"
	? inferIntersection<
			inferDefinition<def[0], $, args>,
			inferDefinition<def[2], $, args>
	  >
	: def[1] extends "|"
	? inferDefinition<def[0], $, args> | inferDefinition<def[2], $, args>
	: def[1] extends ":"
	? inferNarrow<inferDefinition<def[0], $, args>, def[2]>
	: def[1] extends "=>"
	? parseMorph<def[0], def[2], $, args>
	: def[1] extends "@"
	? inferDefinition<def[0], $, args>
	: def extends readonly ["===", ...infer values]
	? values[number]
	: def extends readonly [
			"instanceof",
			...infer constructors extends AbstractableConstructor[]
	  ]
	? InstanceType<constructors[number]>
	: def[0] extends "keyof"
	? inferKeyOfExpression<def[1], $, args>
	: never

export type validatePrefixExpression<
	def extends IndexZeroExpression,
	$,
	args
> = def["length"] extends 1
	? readonly [writeMissingRightOperandMessage<def[0]>]
	: def[0] extends "keyof"
	? readonly [def[0], validateDefinition<def[1], $, args>]
	: def[0] extends "==="
	? readonly [def[0], ...unknown[]]
	: def[0] extends "instanceof"
	? readonly [def[0], ...AbstractableConstructor[]]
	: never

export type validatePostfixExpression<
	def extends PostfixExpression,
	$,
	args
	// conform here is needed to preserve completions for shallow tuple
	// expressions at index 1 after TS 5.1
> = conform<def, readonly [validateDefinition<def[0], $, args>, "[]"]>

export type validateInfixExpression<
	def extends InfixExpression,
	$,
	args
> = def["length"] extends 2
	? readonly [def[0], writeMissingRightOperandMessage<def[1]>]
	: readonly [
			validateDefinition<def[0], $, args>,
			def[1],
			def[1] extends "|"
				? validateDefinition<def[2], $, args>
				: def[1] extends "&"
				? validateDefinition<def[2], $, args>
				: def[1] extends ":"
				? Predicate<extractIn<inferDefinition<def[0], $, args>>>
				: def[1] extends "=>"
				? Morph<extractOut<inferDefinition<def[0], $, args>>, unknown>
				: def[1] extends "@"
				? BaseAttributes | string
				: validateDefinition<def[2], $, args>
	  ]

export type UnparsedTupleExpressionInput = {
	instanceof: AbstractableConstructor
	"===": unknown
}

export type UnparsedTupleOperator = evaluate<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
	ctx.scope.parse(def[1], ctx).keyof()

export type inferKeyOfExpression<operandDef, $, args> = evaluate<
	keyof inferDefinition<operandDef, $, args>
>

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
	if (def[2] === undefined) {
		return throwParseError(writeMissingRightOperandMessage(def[1], ""))
	}
	const l = ctx.scope.parse(def[0], ctx)
	const r = ctx.scope.parse(def[2], ctx)
	return def[1] === "&" ? l.and(r) : l.or(r)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, ctx) =>
	ctx.scope.parse(def[0], ctx).array()

export type PostfixParser<token extends IndexOneOperator> = (
	def: IndexOneExpression<token>,
	ctx: ParseContext
) => Root

export type PrefixParser<token extends IndexZeroOperator> = (
	def: IndexZeroExpression<token>,
	ctx: ParseContext
) => Root

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | ":" | "@"

export type IndexOneExpression<
	token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: List): def is IndexOneExpression =>
	indexOneParsers[def[1] as IndexOneOperator] !== undefined

export const parseMorphTuple: PostfixParser<"=>"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage("=>", def[2])
		)
	}
	// TODO: fix
	return ctx.scope.parse(def[0], ctx) //.constrain("morph", def[2] as Morph)
}

export type parseMorph<inDef, morph, $, args> = morph extends Morph
	? (
			// TODO: should this be extractOut
			In: extractIn<inferDefinition<inDef, $, args>>
	  ) => Out<inferMorphOut<ReturnType<morph>>>
	: never

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export type Out<o = any> = ["=>", o]

export const writeMalformedFunctionalExpressionMessage = (
	operator: FunctionalTupleOperator,
	value: unknown
) =>
	`${
		operator === ":" ? "Narrow" : "Morph"
	} expression requires a function following '${operator}' (was ${typeof value})`

export const parseNarrowTuple: PostfixParser<":"> = (def, ctx) => {
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage(":", def[2])
		)
	}
	return ctx.scope
		.parse(def[0], ctx)
		.constrain("predicate", def[2] as Predicate)
}

const parseAttributeTuple: PostfixParser<"@"> = (def, ctx) => {
	return ctx.scope.parse(def[0], ctx)
}

const indexOneParsers: {
	[token in IndexOneOperator]: PostfixParser<token>
} = {
	"|": parseBranchTuple,
	"&": parseBranchTuple,
	"[]": parseArrayTuple,
	":": parseNarrowTuple,
	"=>": parseMorphTuple,
	"@": parseAttributeTuple
}

export type FunctionalTupleOperator = ":" | "=>"

export type IndexZeroOperator = "keyof" | "instanceof" | "==="

export type IndexZeroExpression<
	token extends IndexZeroOperator = IndexZeroOperator
> = readonly [token, ...unknown[]]

const prefixParsers: {
	[token in IndexZeroOperator]: PrefixParser<token>
} = {
	keyof: parseKeyOfTuple,
	instanceof: (def, ctx) => {
		const objectKind = objectKindOf(def[1])
		if (objectKind !== "Function") {
			return throwParseError(
				writeInvalidConstructorMessage(
					objectKind ? objectKind : domainOf(def[1])
				)
			)
		}
		const branches = def
			.slice(1)
			.map((ctor) =>
				objectKindOf(ctor) === "Function"
					? { basis: ctor as AbstractableConstructor }
					: throwParseError(
							writeInvalidConstructorMessage(
								objectKindOf(ctor) ?? domainOf(def[1])
							)
					  )
			)
		return node() // branches, ctx
	},
	"===": (def) => node({ is: 5 }) //node.unit(...def.slice(1))
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
	prefixParsers[def[0] as IndexZeroOperator] !== undefined

export const writeInvalidConstructorMessage = <
	actual extends Domain | BuiltinObjectKind
>(
	actual: actual
) => `Expected a constructor following 'instanceof' operator (was ${actual}).`
