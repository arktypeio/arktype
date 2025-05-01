import type {
	contains,
	ErrorMessage,
	leftIfEqual,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { QuantifyingChar } from "./quantify.ts"
import type { Regex } from "./regex.ts"

export interface State extends State.Group {
	unscanned: string
	captures: Record<string | number, unknown>
	groups: State.Group[]
}

export type SequenceTree =
	| string
	| {
			union: SequenceTree
	  }
	| SequenceTree[]

export type UnionTree<branches extends SequenceTree[] = SequenceTree[]> = {
	union: branches
}

export declare namespace State {
	export type from<s extends State> = s

	export type initialize<source extends string, flags extends string> = from<{
		unscanned: source
		groups: []
		captures: {}
		name: never
		branches: []
		sequence: []
		quantifiable: []
		caseInsensitive: contains<flags, "i">
	}>

	export type Group = {
		name: string | number
		branches: SequenceTree[]
		sequence: SequenceTree[]
		quantifiable: SequenceTree
		caseInsensitive: boolean
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		export type finalize<g extends Group> =
			g["branches"] extends [] ?
				pushQuantifiable<g["sequence"], g["quantifiable"]>
			:	UnionTree<
					[...g["branches"], pushQuantifiable<g["sequence"], g["quantifiable"]>]
				>
	}
}

export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = QuantifyingChar | Boundary | "|" | "." | "{" | "-" | "\\"

export type AnchorMarker<inner extends Anchor = Anchor> =
	`<${ZeroWidthSpace}${inner}${ZeroWidthSpace}>`

export type StartAnchorMarker = AnchorMarker<"^">
export type EndAnchorMarker = AnchorMarker<"$">

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
		quantifiable extends SequenceTree,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], s["quantifiable"]>
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
		sequence: [...s["sequence"], quantified]
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
			pushQuantifiable<s["sequence"], s["quantifiable"]>
		]
		sequence: []
		quantifiable: []
		caseInsensitive: s["caseInsensitive"]
	}>

	export type anchor<
		s extends State,
		a extends AnchorMarker,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: [...pushQuantifiable<s["sequence"], s["quantifiable"]>, a]
		quantifiable: []
		caseInsensitive: s["caseInsensitive"]
	}>

	type LookaroundMarker = `${ZeroWidthSpace}lookahead`

	export type pushGroup<
		s extends State,
		capture extends string | number,
		unscanned extends string,
		isLookaround extends boolean,
		caseInsensitive extends boolean | undefined
	> = State.from<{
		unscanned: unscanned
		groups: [...s["groups"], s]
		name: isLookaround extends true ? LookaroundMarker : capture
		captures: s["captures"] & Record<capture, unknown>
		branches: []
		sequence: []
		quantifiable: []
		caseInsensitive: caseInsensitive extends boolean ? caseInsensitive
		:	s["caseInsensitive"]
	}>

	export type popGroup<s extends State, unscanned extends string> =
		s["groups"] extends State.Group.pop<infer last, infer init> ?
			State.from<{
				unscanned: unscanned
				groups: init
				captures: s["name"] extends LookaroundMarker ? s["captures"]
				:	s["captures"] & Record<s["name"], State.Group.finalize<s>>
				name: last["name"]
				branches: last["branches"]
				sequence: pushQuantifiable<last["sequence"], last["quantifiable"]>
				quantifiable: s["name"] extends never ? State.Group.finalize<s>
				: s["name"] extends LookaroundMarker ? []
				: State.Group.finalize<s>
				caseInsensitive: last["caseInsensitive"]
			}>
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

type pushQuantifiable<
	sequence extends SequenceTree[],
	quantifiable extends SequenceTree
> = quantifiable extends [] ? sequence : [...sequence, quantifiable]

type finalizeCaptures<captures> = {
	[k in keyof captures]: captures[k] extends (
		infer pattern extends SequenceTree
	) ?
		string
	:	never
} & unknown

type finalizePattern<tokens extends string[]> =
	tokens extends string[] ? validateAnchorless<applyAnchors<tokens[number]>>
	: tokens extends ErrorMessage ? tokens
	: never

type applyAnchors<pattern extends string> =
	pattern extends `${StartAnchorMarker}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${EndAnchorMarker}` ?
			bothStripped
		:	appendNonRedundant<startStripped, string>
	: pattern extends `${infer endStripped}${EndAnchorMarker}` ?
		prependNonRedundant<endStripped, string>
	:	prependNonRedundant<appendNonRedundant<pattern, string>, string>

type anchorsAway<pattern extends string> =
	pattern extends `${StartAnchorMarker}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${EndAnchorMarker}` ?
			bothStripped
		:	startStripped
	: pattern extends `${infer endStripped}${EndAnchorMarker}` ? endStripped
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
	contains<pattern, StartAnchorMarker> extends true ?
		ErrorMessage<writeMidAnchorError<"^">>
	: contains<pattern, EndAnchorMarker> extends true ?
		ErrorMessage<writeMidAnchorError<"$">>
	:	pattern

export const writeMidAnchorError = <anchor extends Anchor>(
	anchor: anchor
): writeMidAnchorError<anchor> => `Anchor ${anchor} may not appear mid-pattern`

type writeMidAnchorError<anchor extends Anchor> =
	`Anchor ${anchor} may not appear mid-pattern`
