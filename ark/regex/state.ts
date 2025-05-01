import type {
	ErrorMessage,
	leftIfEqual,
	noSuggest,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "@ark/util"
import type { QuantifyingChar } from "./quantify.ts"
import type { Regex } from "./regex.ts"

export interface State extends State.Group {
	unscanned: string
	captures: Record<string | number, unknown>
	groups: State.Group[]
}

export declare namespace State {
	export type from<s extends State> = s

	export type initialize<source extends string, flags extends string> = from<{
		unscanned: source
		groups: []
		captures: {}
		name: never
		branches: []
		sequence: [""]
		quantifiable: []
		caseInsensitive: flags extends `${string}i${string}` ? true : false
	}>

	export type Group = {
		name: string | number
		branches: string[]
		sequence: string[]
		quantifiable: string[]
		caseInsensitive: boolean
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		export type finalize<g extends Group> = [
			...g["branches"],
			...appendQuantifiableOuter<g["sequence"], g["quantifiable"]>
		]
	}
}

export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = QuantifyingChar | Boundary | "|" | "." | "{" | "-" | "\\"

export type AnchorMarker<a extends Anchor = Anchor> = `$ark${a}`

export declare namespace s {
	export type error<message extends string> = State.from<{
		unscanned: ErrorMessage<message>
		groups: []
		name: never
		captures: {}
		branches: []
		sequence: []
		quantifiable: []
		caseInsensitive: false
	}>

	export type shiftQuantifiable<
		s extends State,
		quantifiable extends string[],
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<s["sequence"], s["quantifiable"]>
		quantifiable: quantifiable
		caseInsensitive: s["caseInsensitive"]
	}>

	export type pushQuantified<
		s extends State,
		quantified extends string[],
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<s["sequence"], quantified>
		quantifiable: []
		caseInsensitive: s["caseInsensitive"]
	}>

	export type finalizeBranch<
		s extends State,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: [
			...s["branches"],
			...appendQuantifiableOuter<s["sequence"], s["quantifiable"]>
		]
		sequence: [""]
		quantifiable: []
		caseInsensitive: s["caseInsensitive"]
	}>

	export type anchor<
		s extends State,
		a extends Anchor,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<
			appendQuantifiableOuter<s["sequence"], s["quantifiable"]>,
			[AnchorMarker<a>]
		>
		quantifiable: []
		caseInsensitive: s["caseInsensitive"]
	}>

	type lookaroundMarker = noSuggest<"lookahead">

	export type pushGroup<
		s extends State,
		capture extends string | number,
		unscanned extends string,
		isLookaround extends boolean,
		caseInsensitive extends boolean | undefined
	> = State.from<{
		unscanned: unscanned
		groups: [...s["groups"], s]
		name: isLookaround extends true ? lookaroundMarker : capture
		captures: s["captures"] & Record<capture, unknown>
		branches: []
		sequence: [""]
		quantifiable: []
		caseInsensitive: caseInsensitive extends boolean ? caseInsensitive
		:	s["caseInsensitive"]
	}>

	export type popGroup<s extends State, unscanned extends string> =
		s["groups"] extends State.Group.pop<infer last, infer init> ?
			appendQuantifiableOuter<last["sequence"], last["quantifiable"]> extends (
				infer sequence extends string[]
			) ?
				State.from<{
					unscanned: unscanned
					groups: init
					captures: s["name"] extends lookaroundMarker ? s["captures"]
					:	s["captures"] & Record<s["name"], State.Group.finalize<s>>
					name: last["name"]
					branches: last["branches"]
					sequence: sequence
					quantifiable: s["name"] extends never ? State.Group.finalize<s>
					: s["name"] extends lookaroundMarker ? []
					: State.Group.finalize<s>
					caseInsensitive: last["caseInsensitive"]
				}>
			:	never
		:	s.error<writeUnmatchedGroupCloseMessage<")", unscanned>>

	export type finalize<s extends State> =
		s["groups"] extends [unknown, ...unknown[]] ?
			Regex<ErrorMessage<writeUnclosedGroupMessage<")">>>
		: finalizePattern<State.Group.finalize<s>> extends (
			infer pattern extends string
		) ?
			Regex<pattern, finalizeCaptures<s["captures"]>>
		:	never
}

type finalizeCaptures<captures> = {
	[k in keyof captures]: captures[k] extends (infer pattern extends string)[] ?
		anchorsAway<pattern>
	:	never
} & unknown

type shiftTokens<head extends string, tail extends string[]> = [head, ...tail]

type appendQuantifiableOuter<
	sequence extends string[],
	quantifiable extends string[],
	result extends string[] = []
> =
	quantifiable extends [] ? sequence
	: sequence extends shiftTokens<infer seqHead, infer seqTail> ?
		appendQuantifiableOuter<
			seqTail,
			quantifiable,
			[...result, ...appendQuantifiableInner<seqHead, quantifiable, []>]
		>
	:	result

type appendQuantifiableInner<
	seqHead extends string,
	quantifiable extends string[],
	result extends string[]
> =
	quantifiable extends (
		shiftTokens<infer quantifiableHead, infer quantifiableTail>
	) ?
		appendQuantifiableInner<
			seqHead,
			quantifiableTail,
			[...result, appendNonRedundant<seqHead, quantifiableHead>]
		>
	:	result

type finalizePattern<tokens extends string[]> =
	tokens extends string[] ? validateAnchorless<applyAnchors<tokens[number]>>
	: tokens extends ErrorMessage ? tokens
	: never

type applyAnchors<pattern extends string> =
	pattern extends `${AnchorMarker<"^">}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${AnchorMarker<"$">}` ?
			bothStripped
		:	appendNonRedundant<startStripped, string>
	: pattern extends `${infer endStripped}${AnchorMarker<"$">}` ?
		prependNonRedundant<endStripped, string>
	:	prependNonRedundant<appendNonRedundant<pattern, string>, string>

type anchorsAway<pattern extends string> =
	pattern extends `${AnchorMarker<"^">}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${AnchorMarker<"$">}` ?
			bothStripped
		:	startStripped
	: pattern extends `${infer endStripped}${AnchorMarker<"$">}` ? endStripped
	: pattern

type appendNonRedundant<
	base extends string,
	suffix extends string
> = leftIfEqual<base, `${base}${suffix}`>

type prependNonRedundant<
	base extends string,
	prefix extends string
> = leftIfEqual<base, `${prefix}${base}`>

type validateAnchorless<pattern extends string> =
	pattern extends `${string}$ark${infer anchor extends Anchor}${string}` ?
		ErrorMessage<writeMidAnchorError<anchor>>
	:	pattern

export const writeMidAnchorError = <anchor extends Anchor>(
	anchor: anchor
): writeMidAnchorError<anchor> => `Anchor ${anchor} may not appear mid-pattern`

type writeMidAnchorError<anchor extends Anchor> =
	`Anchor ${anchor} may not appear mid-pattern`
