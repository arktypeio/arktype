import type {
	ErrorMessage,
	leftIfEqual,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "@ark/util"
import type { BuiltinQuantifier } from "./quantify.ts"

export interface State extends State.Group {
	unscanned: string
	groups: State.Group[]
}

export declare namespace State {
	export type from<s extends State> = s

	export type initialize<source extends string> = from<{
		unscanned: source
		groups: []
		branches: []
		sequence: [""]
		quantifiable: []
	}>

	export type Group = {
		branches: string[]
		sequence: string[]
		quantifiable: string[]
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		export type finalize<g extends Group> = from<{
			branches: [
				...g["branches"],
				...appendQuantifiableOuter<g["sequence"], g["quantifiable"]>
			]
			sequence: [""]
			quantifiable: []
		}>
	}
}

export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = BuiltinQuantifier | Boundary | "|" | "." | "{"
export type AnchorMarker<a extends Anchor = Anchor> = `$ark${a}`

export declare namespace s {
	export type error<message extends string> = State.from<{
		unscanned: ErrorMessage<message>
		groups: []
		branches: []
		sequence: []
		quantifiable: []
	}>

	export type shiftQuantifiable<
		s extends State,
		quantifiable extends string[],
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<s["sequence"], s["quantifiable"]>
		quantifiable: quantifiable
	}>

	export type pushQuantified<
		s extends State,
		quantified extends string[],
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<s["sequence"], quantified>
		quantifiable: []
	}>

	export type finalizeBranch<
		s extends State,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		branches: [
			...s["branches"],
			...appendQuantifiableOuter<s["sequence"], s["quantifiable"]>
		]
		sequence: [""]
		quantifiable: []
	}>

	export type anchor<
		s extends State,
		a extends Anchor,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		branches: s["branches"]
		sequence: appendQuantifiableOuter<
			appendQuantifiableOuter<s["sequence"], s["quantifiable"]>,
			[AnchorMarker<a>]
		>
		quantifiable: []
	}>

	export type pushGroup<
		s extends State,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: [...s["groups"], s]
		branches: []
		sequence: [""]
		quantifiable: []
	}>

	export type popGroup<s extends State, unscanned extends string> =
		s["groups"] extends State.Group.pop<infer last, infer init> ?
			State.from<{
				unscanned: unscanned
				groups: init
				branches: last["branches"]
				sequence: appendQuantifiableOuter<
					last["sequence"],
					last["quantifiable"]
				>
				quantifiable: State.Group.finalize<s>["branches"]
			}>
		:	s.error<writeUnmatchedGroupCloseMessage<unscanned>>

	export type finalize<s extends State> =
		s["unscanned"] extends ErrorMessage ? s["unscanned"]
		: s["groups"] extends [] ?
			finalizePattern<State.Group.finalize<s>["branches"]>
		:	ErrorMessage<writeUnclosedGroupMessage<")">>
}

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
	tokens extends string[] ? validateAnchorless<anchorsAway<tokens[number]>>
	: tokens extends ErrorMessage ? tokens
	: never

type anchorsAway<pattern extends string> =
	pattern extends `${AnchorMarker<"^">}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${AnchorMarker<"$">}` ?
			bothStripped
		:	appendNonRedundant<startStripped, string>
	: pattern extends `${infer endStripped}${AnchorMarker<"$">}` ?
		prependNonRedundant<endStripped, string>
	:	prependNonRedundant<appendNonRedundant<pattern, string>, string>

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
		MidAnchorError<anchor>
	:	pattern

type MidAnchorError<anchor extends Anchor> =
	ErrorMessage<`Anchor ${anchor} may not appear mid-pattern`>
