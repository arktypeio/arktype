import {
	keywords,
	makeRootAndArrayPropertiesMutable,
	schema,
	type BaseMeta,
	type Morph,
	type MorphChildKind,
	type MutableInner,
	type Node,
	type Out,
	type Predicate,
	type Schema,
	type TypeNode,
	type UnionChildKind,
	type extractIn,
	type extractOut,
	type inferIntersection,
	type inferMorphOut,
	type inferNarrow
} from "@arktype/schema"
import {
	append,
	objectKindOrDomainOf,
	printable,
	throwParseError,
	type BuiltinObjectKind,
	type Constructor,
	type Domain,
	type ErrorMessage,
	type List,
	type conform,
	type evaluate
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { InfixOperator, PostfixExpression } from "./semantic/infer.js"
import { writeUnsatisfiableExpressionError } from "./semantic/validate.js"
import { writeMissingRightOperandMessage } from "./string/shift/operand/unenclosed.js"
import type { BaseCompletions } from "./string/string.js"

export const parseTuple = (def: List, ctx: ParseContext) =>
	maybeParseTupleExpression(def, ctx) ?? parseTupleLiteral(def, ctx)

export const parseTupleLiteral = (def: List, ctx: ParseContext): TypeNode => {
	let sequences: MutableInner<"sequence">[] = [{}]
	let i = 0
	while (i < def.length) {
		let spread = false
		let optional = false
		if (def[i] === "..." && i < def.length - 1) {
			spread = true
			i++
		}

		ctx.path.push(`${i}`)
		const element = ctx.scope.parse(def[i], ctx)
		ctx.path.pop()
		i++
		if (def[i] === "?") {
			if (spread) {
				return throwParseError(spreadOptionalMessage)
			}
			optional = true
			i++
		}
		if (spread) {
			if (!element.extends(keywords.Array)) {
				return throwParseError(writeNonArraySpreadMessage(element))
			}
			// a spread must be distributed over branches e.g.:
			// def: [string, ...(number[] | [true, false])]
			// nodes: [string, ...number[]] | [string, true, false]
			sequences = sequences.flatMap((base) =>
				// since appendElement mutates base, we have to shallow-ish clone it for each branch
				element.branches.map((branch) =>
					appendSpreadBranch(makeRootAndArrayPropertiesMutable(base), branch)
				)
			)
		} else {
			sequences = sequences.map((base) =>
				appendElement(base, optional ? "optional" : "required", element)
			)
		}
	}
	return schema(
		...sequences.map((sequence) => ({
			proto: Array,
			sequence
		}))
	)
}

type ElementKind = "optional" | "required" | "variadic"

const appendElement = (
	base: MutableInner<"sequence">,
	kind: ElementKind,
	element: TypeNode
): MutableInner<"sequence"> => {
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
				base.variadic = element
			}
			return base
	}
}

const appendSpreadBranch = (
	base: MutableInner<"sequence">,
	branch: Node<UnionChildKind>
): MutableInner<"sequence"> => {
	const spread = branch.firstReferenceOfKind("sequence")
	if (!spread) {
		// the only array with no sequence reference is unknown[]
		return appendElement(base, "variadic", keywords.unknown)
	}
	spread.prefix.forEach((node) => appendElement(base, "required", node))
	spread.optionals.forEach((node) => appendElement(base, "optional", node))
	spread.variadic && appendElement(base, "variadic", spread.variadic)
	spread.postfix.forEach((node) => appendElement(base, "required", node))
	return base
}

const maybeParseTupleExpression = (
	def: List,
	ctx: ParseContext
): TypeNode | undefined => {
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
							.map((def) => (typeof def === "string" ? def : printable(def)))
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
			def[0] extends ""
				? BaseCompletions<$, args, IndexZeroOperator | "...">
				: def[0],
			def[1] extends ""
				? BaseCompletions<$, args, IndexOneOperator | "..." | "?">
				: def[1]
	  ]
	: validateTupleLiteral<def, $, args>

export type validateTupleLiteral<def extends List, $, args> = parseSequence<
	def,
	$,
	args
>["validated"]

type inferTupleLiteral<def extends List, $, args> = parseSequence<
	def,
	$,
	args
>["inferred"]

type SequenceParseState = {
	unscanned: List
	inferred: List
	validated: List
}

type parseSequence<def extends List, $, args> = parseNextElement<
	{
		unscanned: def
		inferred: []
		validated: []
	},
	$,
	args
>

type PreparsedElement = {
	head: unknown
	tail: List
	optional: boolean
	spread: boolean
}

namespace PreparsedElement {
	export type from<result extends PreparsedElement> = result
}

type preparseNextElement<s extends SequenceParseState> =
	s["unscanned"] extends readonly ["...", infer head, ...infer tail]
		? tail extends readonly ["?", ...infer postOptionalTail]
			? PreparsedElement.from<{
					head: head
					tail: postOptionalTail
					// this will be an error we have to handle
					optional: true
					spread: true
			  }>
			: PreparsedElement.from<{
					head: head
					tail: tail
					optional: false
					spread: true
			  }>
		: s["unscanned"] extends readonly [infer head, "?", ...infer tail]
		? PreparsedElement.from<{
				head: head
				tail: tail
				optional: true
				spread: false
		  }>
		: s["unscanned"] extends readonly [infer head, ...infer tail]
		? PreparsedElement.from<{
				head: head
				tail: tail
				optional: false
				spread: false
		  }>
		: null

type parseNextElement<
	s extends SequenceParseState,
	$,
	args
> = preparseNextElement<s> extends infer next extends PreparsedElement
	? parseNextElement<
			{
				unscanned: next["tail"]
				inferred: next["spread"] extends true
					? [
							...s["inferred"],
							...conform<inferDefinition<next["head"], $, args>, List>
					  ]
					: next["optional"] extends true
					? [...s["inferred"], inferDefinition<next["head"], $, args>?]
					: [...s["inferred"], inferDefinition<next["head"], $, args>]
				validated: [
					...s["validated"],
					...(next["spread"] extends true
						? [
								inferDefinition<
									next["head"],
									$,
									args
								> extends infer spreadOperand extends List
									? [number, number] extends [
											s["inferred"]["length"],
											spreadOperand["length"]
									  ]
										? ErrorMessage<multipleVariadicMessage>
										: "..."
									: ErrorMessage<writeNonArraySpreadMessage<next["head"]>>
						  ]
						: []),
					[next["optional"] | next["spread"], "?"] extends [
						false,
						s["validated"][number]
					]
						? ErrorMessage<requiredPostOptionalMessage>
						: validateDefinition<next["head"], $, args>,
					...(next["optional"] extends true
						? [
								next["spread"] extends true
									? ErrorMessage<spreadOptionalMessage>
									: number extends s["inferred"]["length"]
									? ErrorMessage<optionalPostVariadicMessage>
									: "?"
						  ]
						: [])
				]
			},
			$,
			args
	  >
	: s

export const writeNonArraySpreadMessage = <operand extends string | TypeNode>(
	operand: operand
) =>
	`Spread element must be an array (was ${operand})` as writeNonArraySpreadMessage<operand>

type writeNonArraySpreadMessage<operand> =
	`Spread element must be an array${operand extends string
		? `(was ${operand})`
		: ""}`

export const multipleVariadicMesage = `A tuple may have at most one variadic element`

type multipleVariadicMessage = typeof multipleVariadicMesage

export const requiredPostOptionalMessage = `A required element may not follow an optional element`

type requiredPostOptionalMessage = typeof requiredPostOptionalMessage

export const optionalPostVariadicMessage = `An optional element may not follow a variadic element`

type optionalPostVariadicMessage = typeof optionalPostVariadicMessage

export const spreadOptionalMessage = `A spread element cannot be optional`

type spreadOptionalMessage = typeof optionalPostVariadicMessage

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
			...infer constructors extends Constructor[]
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
	? readonly [def[0], ...Constructor[]]
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
				? BaseMeta | string
				: validateDefinition<def[2], $, args>
	  ]

export type UnparsedTupleExpressionInput = {
	instanceof: Constructor
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
) => TypeNode

export type PrefixParser<token extends IndexZeroOperator> = (
	def: IndexZeroExpression<token>,
	ctx: ParseContext
) => TypeNode

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
	// TODO: nested morphs?
	return schema({
		in: ctx.scope.parse(def[0], ctx) as Schema<MorphChildKind>,
		morph: def[2] as Morph
	})
}

export const writeMalformedFunctionalExpressionMessage = (
	operator: FunctionalTupleOperator,
	value: unknown
) =>
	`${
		operator === ":" ? "Narrow" : "Morph"
	} expression requires a function following '${operator}' (was ${typeof value})`

export type parseMorph<inDef, morph, $, args> = morph extends Morph
	? (
			In: extractIn<inferDefinition<inDef, $, args>>
	  ) => Out<inferMorphOut<ReturnType<morph>>>
	: never

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

const parseAttributeTuple: PostfixParser<"@"> = (def, ctx) =>
	ctx.scope.parse(def[0], ctx).configureShallowDescendants(def[2] as never)

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
	instanceof: (def) => {
		if (typeof def[1] !== "function") {
			return throwParseError(
				writeInvalidConstructorMessage(objectKindOrDomainOf(def[1]))
			)
		}
		const branches = def
			.slice(1)
			.map((ctor) =>
				typeof ctor === "function"
					? { proto: ctor as Constructor }
					: throwParseError(
							writeInvalidConstructorMessage(objectKindOrDomainOf(ctor))
					  )
			)
		return schema(...branches)
	},
	"===": (def) => schema.units(...def.slice(1))
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
	prefixParsers[def[0] as IndexZeroOperator] !== undefined

export const writeInvalidConstructorMessage = <
	actual extends Domain | BuiltinObjectKind
>(
	actual: actual
) => `Expected a constructor following 'instanceof' operator (was ${actual})`
