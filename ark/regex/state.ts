import type {
	contains,
	ErrorMessage,
	leftIfEqual,
	repeat,
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

export type PatternTree =
	| string
	| {
			union: PatternTree
	  }
	| PatternTree[]

export type UnionTree<branches extends PatternTree[] = PatternTree[]> = {
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
		root: []
		caseInsensitive: contains<flags, "i">
	}>

	export type Group = {
		name: string | number
		branches: PatternTree[]
		sequence: PatternTree
		root: PatternTree
		caseInsensitive: boolean
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		export type finalize<g extends Group> =
			g["branches"] extends [] ? pushQuantifiable<g["sequence"], g["root"]>
			:	UnionTree<[...g["branches"], pushQuantifiable<g["sequence"], g["root"]>]>
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
		root: []
		caseInsensitive: false
	}>

	export type shiftQuantifiable<
		s extends State,
		root extends PatternTree,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], s["root"]>
		root: root
		caseInsensitive: s["caseInsensitive"]
	}>

	export type pushQuantified<
		s extends State,
		quantified extends PatternTree,
		unscanned extends string
	> = State.from<{
		unscanned: unscanned
		groups: s["groups"]
		name: s["name"]
		captures: s["captures"]
		branches: s["branches"]
		sequence: pushQuantifiable<s["sequence"], quantified>
		root: []
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
		branches: [...s["branches"], pushQuantifiable<s["sequence"], s["root"]>]
		sequence: []
		root: []
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
		sequence: pushQuantifiable<s["sequence"], pushQuantifiable<s["root"], a>>
		root: []
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
		root: []
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
				sequence: pushQuantifiable<last["sequence"], last["root"]>
				root: s["name"] extends never ? State.Group.finalize<s>
				: s["name"] extends LookaroundMarker ? []
				: State.Group.finalize<s>
				caseInsensitive: last["caseInsensitive"]
			}>
		:	s.error<writeUnmatchedGroupCloseMessage<")", unscanned>>

	export type finalize<s extends State> =
		s["groups"] extends [unknown, ...unknown[]] ?
			Regex<ErrorMessage<writeUnclosedGroupMessage<")">>>
		:	Regex<
				validateAnchorless<applyAnchors<finalizeRoot<State.Group.finalize<s>>>>,
				finalizeCaptures<s["captures"]>
			>
}

type pushQuantifiable<sequence extends PatternTree, root extends PatternTree> =
	root extends [] ? sequence
	: sequence extends unknown[] ?
		sequence extends [] ? root
		: root extends unknown[] ? [...sequence, ...root]
		: [...sequence, root]
	:	[sequence, root]

type finalizeCaptures<captures> = {
	[k in keyof captures]: anchorsAway<finalizeRoot<captures[k]>>
} & unknown

type finalizeRoot<tree> =
	finalizeTree<tree, [1]> extends { pattern: infer pattern extends string } ?
		pattern
	:	never

type TreeResult<pattern extends string = string, depth extends 1[] = 1[]> = {
	pattern: pattern
	depth: depth
}

type finalizeTree<tree, depth extends 1[]> =
	tree extends string ? TreeResult<tree, depth>
	: tree extends unknown[] ? finalizeTreeSequence<tree, TreeResult<"", [1]>>
	: tree extends UnionTree<infer branches> ?
		finalizeTreeUnion<branches, never, repeat<depth, branches["length"]>>
	:	never

type finalizeTreeSequence<tree extends unknown[], result extends TreeResult> =
	tree extends [infer head, ...infer tail] ?
		finalizeTree<head, [1]> extends infer next extends TreeResult ?
			finalizeTreeSequence<
				tail,
				TreeResult<
					appendNonRedundant<result["pattern"], next["pattern"]>,
					repeat<result["depth"], next["depth"]["length"]>
				>
			>
		:	never
	:	result

type finalizeTreeUnion<
	branches extends unknown[],
	pattern extends string,
	depth extends 1[]
> =
	branches extends [infer head, ...infer tail] ?
		finalizeTree<head, depth> extends infer next extends TreeResult ?
			finalizeTreeUnion<tail, pattern | next["pattern"], depth>
		:	never
	:	TreeResult<pattern, depth>

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
