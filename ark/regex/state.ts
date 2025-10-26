import type {
	contains,
	ErrorMessage,
	noSuggest,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { quantify, QuantifyingChar } from "./quantify.ts"
import type { Flags, IndexedCaptures, NamedCaptures, Regex } from "./regex.ts"

export interface State extends State.Group {
	unscanned: string
	groups: State.Group[]
	/** the initial flags passed to the root of the expression */
	flags: Flags
}

export declare namespace State {
	export type from<s extends State> = s

	export type initialize<source extends string, flags extends Flags> = from<{
		unscanned: source
		groups: []
		capture: never
		branches: []
		sequence: ""
		root: ""
		caseInsensitive: contains<flags, "i">
		flags: flags
	}>

	enum UnnamedCaptureKind {
		indexed,
		lookaround,
		noncapturing
	}

	export type CaptureKind = string | UnnamedCaptureKind

	export type Group = {
		/** the name of the group or its kind */
		capture: CaptureKind
		branches: Branch[]
		sequence: Branch
		root: Branch
		caseInsensitive: boolean
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		// s["capture"] extends CapturedGroupKind ? State.Group.finalize<s>
		// 				: s["capture"] extends State.UnnamedCaptureKind.lookaround ? ""
		// 				: // non-capturing
		// 					State.Group.finalize<s>

		export type finalize<s extends State> = finalizeBranches<s>

		type finalizeBranches<s extends State> =
			s["branches"] extends [] ? pushQuantifiable<s["sequence"], s["root"]>
			: [...s["branches"], pushQuantifiable<s["sequence"], s["root"]>] extends (
				infer branches extends Branch[]
			) ?
				branches[number]
			:	never
	}
}

export type Branch = string | CaptureBranch

export type CaptureBranch = {
	pattern: string
	captures: IndexedCaptures
	names: NamedCaptures
}

export declare namespace CaptureBranch {
	export type from<b extends CaptureBranch> = b
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
		capture: never
		branches: []
		sequence: ""
		root: ""
		caseInsensitive: false
		flags: ""
	}>

	export type shiftQuantifiable<
		s extends State,
		root extends Branch,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		capture: s["capture"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], s["root"]>
		root: root
		caseInsensitive: s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type pushQuantified<
		s extends State,
		quantified extends Branch,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		capture: s["capture"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], quantified>
		root: ""
		caseInsensitive: s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type pushQuantifier<
		s extends State,
		min extends number,
		max extends number | null,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		capture: s["capture"]
		branches: s["branches"]
		sequence: pushQuantifiable<
			s["sequence"],
			s["root"] extends string ? quantify<s["root"], min, max>
			: s["root"] extends CaptureBranch ?
				CaptureBranch.from<{
					pattern: quantify<s["root"]["pattern"], min, max>
					captures: s["root"]["captures"]
					names: s["root"]["names"]
				}>
			:	never
		>
		root: ""
		caseInsensitive: s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type finalizeBranch<
		s extends State,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		capture: s["capture"]
		branches: [...s["branches"], pushQuantifiable<s["sequence"], s["root"]>]
		sequence: ""
		root: ""
		caseInsensitive: s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type anchor<
		s extends State,
		a extends AnchorMarker,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		capture: s["capture"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], pushQuantifiable<s["root"], a>>
		root: ""
		caseInsensitive: s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type pushGroup<
		s extends State,
		capture extends string | State.UnnamedCaptureKind,
		unscanned extends string,
		caseInsensitive extends boolean | undefined
	> = State.from<{
		unscanned: unscanned
		groups: [...s["groups"], s]
		capture: capture
		branches: []
		sequence: ""
		root: ""
		caseInsensitive: caseInsensitive extends boolean ? caseInsensitive
		:	s["caseInsensitive"]
		flags: s["flags"]
	}>

	export type popGroup<s extends State, unscanned extends string> =
		s["groups"] extends State.Group.pop<infer last, infer init> ?
			State.from<{
				unscanned: unscanned
				groups: init
				capture: last["capture"]
				branches: last["branches"]
				sequence: pushQuantifiable<last["sequence"], last["root"]>
				root: State.Group.finalize<s>
				caseInsensitive: last["caseInsensitive"]
				flags: s["flags"]
			}>
		:	s.error<writeUnmatchedGroupCloseMessage<")", unscanned>>

	export type finalize<s extends State> =
		s["groups"] extends [unknown, ...unknown[]] ?
			ErrorMessage<writeUnclosedGroupMessage<")">>
		: State.Group.finalize<s> extends infer result ?
			[result] extends [CaptureBranch] ?
				finalizeRegex<
					result["pattern"],
					result["captures"],
					result["names"],
					s["flags"]
				>
			:	finalizeRegex<result & string, EmptyCaptures, {}, s["flags"]>
		:	never

	type finalizeRegex<
		pattern extends string,
		captures extends IndexedCaptures,
		names extends NamedCaptures,
		flags extends Flags
	> =
		applyAnchors<pattern> extends infer anchoredPattern extends string ?
			// check the negation in case pattern is a union in which some
			// branches contain invalid anchors
			contains<anchoredPattern, StartAnchorMarker> extends false ?
				contains<anchoredPattern, EndAnchorMarker> extends false ?
					Regex<anchoredPattern, finalizeContext<captures, names, flags>>
				:	ErrorMessage<writeMidAnchorError<"$">>
			:	ErrorMessage<writeMidAnchorError<"^">>
		:	never

	type finalizeContext<
		captures extends IndexedCaptures,
		names extends NamedCaptures,
		flags extends Flags
	> =
		captures extends EmptyCaptures ? finalizeContextWithoutCaptures<flags>
		:	finalizeContextWithCaptures<
				// re-align 1-based indexing for capture groups to 0-based for
				// external display
				captures extends (
					[IndexedCaptureOffset, ...infer rest extends IndexedCaptures]
				) ?
					rest
				:	never,
				names,
				flags
			>

	type finalizeContextWithoutCaptures<flags extends Flags> =
		flags extends "" ? {}
		:	{
				flags: flags
			}

	type finalizeContextWithCaptures<
		captures extends IndexedCaptures,
		names extends NamedCaptures,
		flags extends Flags
	> =
		keyof names extends never ?
			flags extends "" ?
				{ captures: captures }
			:	{ captures: captures; flags: flags }
		: flags extends "" ?
			{
				captures: captures
				names: names
			}
		:	{
				captures: captures
				names: names
				flags: flags
			}
}

export const writeIncompleteReferenceError = <ref extends string>(
	ref: ref
): writeIncompleteReferenceError<ref> =>
	`Reference to incomplete group '${ref}' has no effect`

export type writeIncompleteReferenceError<ref extends string> =
	`Reference to incomplete group '${ref}' has no effect`

export type CapturedGroupKind = string | State.UnnamedCaptureKind.indexed

export type IncompleteCaptureGroup = noSuggest<"incompleteCaptureGroup">

export type IndexedCaptureOffset = noSuggest<"indexedCaptureOffset">

/**
 * Offset captures to match 1-based indexing for references
 * (i.e so that \1 would match the first capture group)
 */
export type EmptyCaptures = [IndexedCaptureOffset]

export type pushQuantifiable<
	sequence extends Branch,
	root extends Branch
> = appendNonRedundant<sequence, root>
// root extends "" ? sequence
// : sequence extends string ?
// 	sequence extends "" ? root
// 	: root extends string ? appendNonRedundant<sequence, root>
// 	: never
// :	never

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

type appendNonRedundant<base extends string, suffix extends string> =
	string extends base ?
		string extends suffix ?
			string
		:	`${base}${suffix}`
	: // this is not generalizable, but arkregex uses `${bigint}`
	// to represent digits without a `-`, so it is valid to merge them
	`${bigint}` extends base ?
		`${bigint}` extends suffix ?
			`${bigint}`
		:	`${base}${suffix}`
	:	`${base}${suffix}`

type prependNonRedundant<base extends string, prefix extends string> =
	string extends base ?
		string extends prefix ?
			string
		:	`${prefix}${base}`
	: // this is not generalizable, but arkregex uses `${bigint}`
	// to represent digits without a `-`, so it is valid to merge them
	`${bigint}` extends base ?
		`${bigint}` extends prefix ?
			`${bigint}`
		:	`${prefix}${base}`
	:	`${prefix}${base}`

export const writeMidAnchorError = <anchor extends Anchor>(
	anchor: anchor
): writeMidAnchorError<anchor> => `Anchor ${anchor} may not appear mid-pattern`

type writeMidAnchorError<anchor extends Anchor> =
	`Anchor ${anchor} may not appear mid-pattern`
