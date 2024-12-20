import {
	$ark,
	makeRootAndArrayPropertiesMutable,
	postfixAfterOptionalOrDefaultableMessage,
	type BaseParseContext,
	type BaseRoot,
	type mutableInnerOfKind,
	type nodeOfKind,
	type Sequence,
	type Union
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
import type { inferDefinition, validateInnerDefinition } from "./definition.ts"
import {
	parseProperty,
	type DefaultablePropertyTuple,
	type OptionalPropertyDefinition,
	type PossibleDefaultableStringDefinition
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

		i++
		if (spread) {
			if (!valueNode.extends($ark.intrinsic.Array))
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
	branch: nodeOfKind<Union.ChildKind>
): mutableInnerOfKind<"sequence"> => {
	const spread = branch.firstReferenceOfKind("sequence")
	if (!spread) {
		// the only array with no sequence reference is unknown[]
		return appendVariadicElement(base, $ark.intrinsic.unknown)
	}

	spread.prefix?.forEach(node => appendRequiredElement(base, node))
	spread.optionals?.forEach(node => appendOptionalElement(base, node))
	if (spread.variadic) appendVariadicElement(base, spread.variadic)
	spread.postfix?.forEach(node => appendRequiredElement(base, node))

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
	kind: head extends OptionalPropertyDefinition ? SequencePhase.optionals
	: head extends DefaultablePropertyTuple ? SequencePhase.defaultables
	: // TODO: more precise
	head extends PossibleDefaultableStringDefinition ? SequencePhase.defaultables
	: "required"
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
				// if the spread operand is a fixed-length tuple, it won't be a variadic element
				// and therefore doesn't need to be validated as one
				[s["phase"], number] extends (
					[SequencePhase.postfix, spreadOperand["length"]]
				) ?
					ErrorMessage<multipleVariadicMessage>
				:	"..."
			:	ErrorMessage<writeNonArraySpreadMessage<next["head"]>>
		]
	:	[]

type nextValidatedElement<
	s extends SequenceParseState,
	next extends PreparsedElement
> =
	next["kind"] extends SequencePhase.optionals ?
		next["spread"] extends true ? ErrorMessage<spreadOptionalMessage>
		: s["phase"] extends SequencePhase.postfix ?
			ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
		:	next["validated"]
	: next["kind"] extends SequencePhase.defaultables ?
		next["spread"] extends true ? ErrorMessage<spreadDefaultableMessage>
		: s["phase"] extends SequencePhase.optionals ?
			ErrorMessage<defaultablePostOptionalMessage>
		: s["phase"] extends SequencePhase.postfix ?
			ErrorMessage<optionalOrDefaultableAfterVariadicMessage>
		:	next["validated"]
	: [s["phase"], next["spread"]] extends (
		[SequencePhase.optionals | SequencePhase.defaultables, false]
	) ?
		ErrorMessage<postfixAfterOptionalOrDefaultableMessage>
	:	next["validated"]

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
