import {
	$ark,
	checkDefault,
	makeRootAndArrayPropertiesMutable,
	postfixAfterOptionalOrDefaultableMessage,
	type BaseParseContext,
	type BaseRoot,
	type mutableInnerOfKind,
	type Sequence
} from "@ark/schema"
import {
	append,
	isArray,
	isEmptyObject,
	throwParseError,
	type array,
	type conform,
	type ErrorMessage,
	type satisfy
} from "@ark/util"
import type { isInferredDefault } from "../attributes.ts"
import type { inferDefinition, validateInnerDefinition } from "./definition.ts"
import {
	parseProperty,
	type DefaultablePropertyTuple,
	type isDefaultable,
	type OptionalPropertyDefinition
} from "./property.ts"

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

		const parsedProperty = parseProperty(def[i], ctx)

		const [valueNode, operator, possibleDefaultValue] =
			!isArray(parsedProperty) ? [parsedProperty] : parsedProperty

		// what's spread is its elements, which an optional or a default can't be
		if (spread && operator) {
			return throwParseError(
				operator === "?" ? spreadOptionalMessage : spreadDefaultableMessage
			)
		}

		// string defaults run no user code
		if (
			typeof def[i] === "string" &&
			typeof possibleDefaultValue === "function"
		)
			checkDefault(valueNode, possibleDefaultValue(), null)

		i++
		if (spread) {
			if (!valueNode.extends($ark.kw.Array))
				return throwParseError(writeNonArraySpreadMessage(valueNode.expression))

			// a spread must be distributed over branches e.g.:
			// def: [string, ...(number[] | [true, false])]
			// nodes: [string, ...number[]] | [string, true, false]
			sequences = sequences.flatMap(base =>
				// since appendElement mutates base, we have to shallow-ish clone it for each branch
				valueNode.distribute(branch =>
					appendSpreadBranch(makeRootAndArrayPropertiesMutable(base), branch)
				)
			)
		} else {
			sequences = sequences.map(base => {
				if (operator === "?") return appendOptionalElement(base, valueNode)

				if (operator === "=")
					return appendDefaultableElement(base, valueNode, possibleDefaultValue)

				return appendRequiredElement(base, valueNode)
			})
		}
	}

	return ctx.$.node("union", {
		branches: sequences.map(sequence =>
			isEmptyObject(sequence) ?
				ctx.$.node("intersection", {
					proto: ctx.$.node("proto", { proto: Array }),
					exactLength: ctx.$.node("exactLength", { rule: 0 })
				})
			:	ctx.$.node("intersection", {
					proto: ctx.$.node("proto", { proto: Array }),
					structure: ctx.$.node("structure", {
						sequence: ctx.$.node("sequence", sequence)
					})
				})
		)
	})
}

export type validateTupleLiteral<def extends array, $, args> =
	parseSequence<def, $, args> extends infer s extends SequenceParseState ?
		Readonly<s["validated"]>
	:	never

export type inferTupleLiteral<def extends array, $, args> =
	parseSequence<def, $, args> extends infer s extends SequenceParseState ?
		s["inferred"]
	:	never

const appendRequiredElement = (
	base: mutableInnerOfKind<"sequence">,
	element: BaseRoot
): mutableInnerOfKind<"sequence"> => {
	if (base.defaultables || base.optionals) {
		return throwParseError(
			base.variadic ?
				// e.g. [boolean = true, ...string[], number]
				postfixAfterOptionalOrDefaultableMessage
				// e.g. [string?, number]
			:	requiredPostOptionalMessage
		)
	}
	if (base.variadic) {
		// e.g. [...string[], number]
		base.postfix = append(base.postfix, element)
	} else {
		// e.g. [string, number]
		base.prefix = append(base.prefix, element)
	}
	return base
}

const appendOptionalElement = (
	base: mutableInnerOfKind<"sequence">,
	element: BaseRoot
): mutableInnerOfKind<"sequence"> => {
	if (base.variadic)
		// e.g. [...string[], number?]
		return throwParseError(optionalOrDefaultableAfterVariadicMessage)
	// e.g. [string, number?]
	base.optionals = append(base.optionals, element)
	return base
}

const appendDefaultableElement = (
	base: mutableInnerOfKind<"sequence">,
	element: BaseRoot,
	value: unknown
): mutableInnerOfKind<"sequence"> => {
	if (base.variadic)
		// e.g. [...string[], number = 0]
		return throwParseError(optionalOrDefaultableAfterVariadicMessage)
	if (base.optionals)
		// e.g. [string?, number = 0]
		return throwParseError(defaultablePostOptionalMessage)

	// value's assignability to element will be checked when the
	// sequence is instantiated by @ark/schema
	// e.g. [string, number = 0]
	base.defaultables = append(base.defaultables, [[element, value]])
	return base
}

const appendVariadicElement = (
	base: mutableInnerOfKind<"sequence">,
	element: BaseRoot
): mutableInnerOfKind<"sequence"> => {
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

const appendSpreadBranch = (
	base: mutableInnerOfKind<"sequence">,
	branch: BaseRoot
): mutableInnerOfKind<"sequence"> => {
	const spread = branch.select({ method: "find", kind: "sequence" })
	if (!spread) {
		// an array with no sequence reference is the empty tuple, which adds no
		// elements, or unknown[]
		return branch.select({ method: "find", kind: "exactLength" })?.rule === 0 ?
				base
			:	appendVariadicElement(base, $ark.kw.unknown)
	}

	if (spread.prefix)
		for (const node of spread.prefix) appendRequiredElement(base, node)
	if (spread.defaultables) {
		for (const [node, def] of spread.defaultables)
			appendDefaultableElement(base, node, def)
	}
	if (spread.optionals)
		for (const node of spread.optionals) appendOptionalElement(base, node)
	if (spread.variadic) appendVariadicElement(base, spread.variadic)
	if (spread.postfix)
		for (const node of spread.postfix) appendRequiredElement(base, node)

	return base
}

type SequencePhase = satisfy<
	keyof Sequence.Inner,
	| SequencePhase.prefix
	| SequencePhase.optionals
	| SequencePhase.defaultables
	| SequencePhase.postfix
>

declare namespace SequencePhase {
	export type prefix = "prefix"

	export type optionals = "optionals"

	export type defaultables = "defaultables"

	export type postfix = "postfix"
}

type SequenceParseState = {
	unscanned: array
	inferred: array
	validated: array
	phase: SequencePhase
}

type parseSequence<def extends array, $, args> = parseNextElement<
	{
		unscanned: def
		inferred: []
		validated: []
		phase: SequencePhase.prefix
	},
	$,
	args
>

type PreparsedElementKind =
	| "required"
	| SequencePhase.optionals
	| SequencePhase.defaultables

type PreparsedElement = {
	head: unknown
	tail: array
	inferred: unknown
	validated: unknown
	kind: PreparsedElementKind
	spread: boolean
}

declare namespace PreparsedElement {
	export type from<result extends PreparsedElement> = result

	export type required = "required"

	export type optionals = "optionals"

	export type defaultables = "defaultables"
}

type preparseNextState<s extends SequenceParseState, $, args> =
	s["unscanned"] extends readonly ["...", infer head, ...infer tail] ?
		preparseNextElement<head, tail, true, $, args>
	: s["unscanned"] extends readonly [infer head, ...infer tail] ?
		preparseNextElement<head, tail, false, $, args>
	:	null

type preparseNextElement<
	head,
	tail extends array,
	spread extends boolean,
	$,
	args
> = PreparsedElement.from<{
	head: head
	tail: tail
	inferred: inferDefinition<head, $, args>
	validated: validateInnerDefinition<head, $, args>
	// if inferredHead is optional and the element is spread, this will be an error
	// handled in nextValidatedSpreadElements
	kind: head extends OptionalPropertyDefinition ? PreparsedElement.optionals
	: head extends DefaultablePropertyTuple ? PreparsedElement.defaultables
	: isDefaultable<head, $, args> extends true ? PreparsedElement.defaultables
	: PreparsedElement.required
	spread: spread
}>

type parseNextElement<s extends SequenceParseState, $, args> =
	preparseNextState<s, $, args> extends infer next extends PreparsedElement ?
		parseNextElement<
			{
				unscanned: next["tail"]
				inferred: nextInferred<s, next>
				validated: nextValidated<s, next>
				phase: next["kind"] extends (
					SequencePhase.optionals | SequencePhase.defaultables
				) ?
					next["kind"]
				: next["spread"] extends true ? spreadPhase<s, next>
				: // if we're parsing the variadic element, don't update the phase
				// so that we can still check it to ensure we don't have
				// postfix elements following optionals or defaultables
				number extends nextInferred<s, next>["length"] ? s["phase"]
				: SequencePhase.prefix
			},
			$,
			args
		>
	:	s

type nextInferred<s extends SequenceParseState, next extends PreparsedElement> =
	next["spread"] extends true ?
		[...s["inferred"], ...conform<next["inferred"], array>]
	: next["kind"] extends SequencePhase.optionals ?
		[...s["inferred"], next["inferred"]?]
	:	[...s["inferred"], next["inferred"]]

type nextValidated<
	s extends SequenceParseState,
	next extends PreparsedElement
> = [
	...s["validated"],
	...nextValidatedSpreadOperatorIfPresent<s, next>,
	nextValidatedElement<s, next>
]

type nextValidatedSpreadOperatorIfPresent<
	s extends SequenceParseState,
	next extends PreparsedElement
> =
	next["spread"] extends true ?
		[
			next["inferred"] extends infer spreadOperand extends array ?
				Extract<spreadResult<s, spreadOperand>, ErrorMessage> extends infer e ?
					[e] extends [never] ?
						"..."
					:	e
				:	never
			:	ErrorMessage<writeNonArraySpreadMessage<next["head"]>>
		]
	:	[]

type spreadPhase<s extends SequenceParseState, next extends PreparsedElement> =
	[next["inferred"]] extends [array] ?
		Exclude<spreadResult<s, next["inferred"]>, ErrorMessage> extends (
			infer phase extends SequencePhase
		) ?
			[phase] extends [never] ?
				s["phase"]
			:	phase
		:	never
	:	s["phase"]

// any could be any array, so all that's known of what it appends is that it
// may be variadic
type spreadResult<s extends SequenceParseState, operand extends array> =
	0 extends 1 & operand ?
		isVariadic<s> extends true ?
			ErrorMessage<multipleVariadicMessage>
		:	s["phase"]
	:	appendSpreadElements<s["phase"], isVariadic<s>, operand>

/**
 * The phase after a spread's elements are appended one at a time to those
 * before it, as runtime appends them, or the error appending one throws:
 * its required elements, then defaultable, optional, variadic and postfix
 */
type appendSpreadElements<
	phase extends SequencePhase,
	variadic extends boolean,
	elements extends array
> =
	elements extends readonly [] ? phase
	: elements extends readonly [infer head, ...infer tail] ?
		isInferredDefault<head> extends true ?
			variadic extends true ?
				ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
			: phase extends SequencePhase.optionals ?
				ErrorMessage<defaultablePostOptionalMessage>
			:	appendSpreadElements<SequencePhase.defaultables, variadic, tail>
		: phase extends SequencePhase.prefix ?
			appendSpreadElements<phase, variadic, tail>
		: variadic extends true ?
			ErrorMessage<postfixAfterOptionalOrDefaultableMessage>
		:	ErrorMessage<requiredPostOptionalMessage>
	: elements[number][] extends elements ?
		variadic extends true ?
			ErrorMessage<multipleVariadicMessage>
		:	phase
	: elements extends readonly [...infer init, unknown] ?
		appendSpreadElements<phase, variadic, init> extends infer result ?
			result extends ErrorMessage | SequencePhase.prefix ?
				result
			:	ErrorMessage<postfixAfterOptionalOrDefaultableMessage>
		:	never
	: elements extends readonly [unknown?, ...infer tail] ?
		variadic extends true ?
			ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
		:	appendSpreadElements<SequencePhase.optionals, variadic, tail>
	:	phase

type nextValidatedElement<
	s extends SequenceParseState,
	next extends PreparsedElement
> =
	next["kind"] extends SequencePhase.optionals ?
		next["spread"] extends true ? ErrorMessage<spreadOptionalMessage>
		: isVariadic<s> extends true ?
			ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
		:	next["validated"]
	: next["kind"] extends SequencePhase.defaultables ?
		next["spread"] extends true ? ErrorMessage<spreadDefaultableMessage>
		: isVariadic<s> extends true ?
			ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
		: s["phase"] extends SequencePhase.optionals ?
			ErrorMessage<defaultablePostOptionalMessage>
		:	next["validated"]
	: [s["phase"], next["spread"]] extends (
		[SequencePhase.optionals | SequencePhase.defaultables, false]
	) ?
		isVariadic<s> extends true ?
			ErrorMessage<postfixAfterOptionalOrDefaultableMessage>
		:	ErrorMessage<requiredPostOptionalMessage>
	:	next["validated"]

// whether the elements parsed so far include a variadic one, as the runtime
// checks an element against what's been appended before it
type isVariadic<s extends SequenceParseState> =
	number extends s["inferred"]["length"] ? true : false

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

export const optionalOrDefaultableAfterVariadicMessage =
	"An optional element may not follow a variadic element"

type optionalOrDefaultableAfterVariadicMessage =
	typeof optionalOrDefaultableAfterVariadicMessage

export const spreadOptionalMessage = "A spread element cannot be optional"

type spreadOptionalMessage = typeof spreadOptionalMessage

export const spreadDefaultableMessage = "A spread element cannot have a default"

type spreadDefaultableMessage = typeof spreadDefaultableMessage

export const defaultablePostOptionalMessage =
	"A defaultable element may not follow an optional element without a default"

type defaultablePostOptionalMessage = typeof defaultablePostOptionalMessage
