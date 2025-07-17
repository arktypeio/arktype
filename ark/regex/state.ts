import type {
	array,
	contains,
	ErrorMessage,
	leftIfEqual,
	longerThan,
	tailOf,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { QuantifyingChar } from "./quantify.ts"
import type { NamedCaptures } from "./regex.ts"

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
		sequence: SequenceTree.Empty
		root: ""
		caseInsensitive: contains<flags, "i">
	}>

	export type Finalized = {
		pattern: string
		captures: string[]
		namedCaptures: NamedCaptures
	}

	export namespace Finalized {
		export type from<s extends Finalized> = s
	}

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
			: [...g["branches"], pushQuantifiable<g["sequence"], g["root"]>] extends (
				infer branches extends PatternTree[]
			) ?
				finalizeUnion<branches, [], []>
			:	never

		type finalizeUnion<
			remaining extends PatternTree[],
			flattened extends PatternTree[],
			depth extends 1[]
		> =
			remaining extends (
				[infer head extends PatternTree, ...infer tail extends PatternTree[]]
			) ?
				head extends UnionTree<infer headBranches, infer headDepth> ?
					finalizeUnion<
						tail,
						[...flattened, ...headBranches],
						[...depth, ...headDepth]
					>
				:	finalizeUnion<tail, [...flattened, head], [...depth, ...depthOf<head>]>
			:	UnionTree<flattened, depth>
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
		sequence: SequenceTree.Empty
		root: ""
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
		root: ""
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
		sequence: SequenceTree.Empty
		root: ""
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
		root: ""
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
		sequence: SequenceTree.Empty
		root: ""
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
				: s["name"] extends LookaroundMarker ? ""
				: State.Group.finalize<s>
				caseInsensitive: last["caseInsensitive"]
			}>
		:	s.error<writeUnmatchedGroupCloseMessage<")", unscanned>>

	export type finalize<s extends State> =
		s["groups"] extends [unknown, ...unknown[]] ?
			ErrorMessage<writeUnclosedGroupMessage<")">>
		:	State.Finalized.from<{
				pattern: validateAnchorless<
					applyAnchors<finalizeTree<State.Group.finalize<s>>>
				>
				captures: finalizeCaptures<s["captures"]>
				namedCaptures: finalizeNamedCaptures<s["captures"]>
			}>
}

export type PatternTree = string | UnionTree | SequenceTree

export interface CompositeTree<
	children extends PatternTree[] = PatternTree[],
	depth extends 1[] = 1[]
> {
	children: children
	depth: depth
}

export interface SequenceTree<
	children extends PatternTree[] = PatternTree[],
	depth extends 1[] = 1[]
> extends CompositeTree<children, depth> {
	kind: "sequence"
}

export declare namespace SequenceTree {
	export type Empty = SequenceTree<[], [1]>

	export type finalize<self extends SequenceTree> = _finalize<
		self["children"],
		self["depth"],
		""
	>

	type _finalize<
		tree extends unknown[],
		depth extends 1[],
		result extends string
	> =
		tree extends [infer head, ...infer tail] ?
			_finalize<tail, depth, appendNonRedundant<result, finalizeTree<head>>>
		:	result
}

export interface UnionTree<
	children extends PatternTree[] = PatternTree[],
	depth extends 1[] = 1[]
> extends CompositeTree<children, depth> {
	kind: "union"
}

export declare namespace UnionTree {
	export type finalize<self extends UnionTree> = _finalize<
		self["children"],
		never
	>

	type _finalize<branches extends unknown[], pattern extends string> =
		branches extends [infer head, ...infer tail] ?
			_finalize<tail, pattern | finalizeTree<head>>
		:	pattern
}

declare global {
	export interface ArkEnv {
		maxDepth(): 8191
	}

	export namespace ArkEnv {
		export type maxDepth = ReturnType<ArkEnv["maxDepth"]>
	}
}

export type pushQuantifiable<
	sequence extends PatternTree,
	root extends PatternTree
> =
	root extends "" ? sequence
	: sequence extends string ?
		sequence extends "" ?
			root
		:	SequenceTree<[sequence, root], depthOf<root>>
	: sequence extends SequenceTree ? pushToSequence<sequence, root>
	: pushToUnion<
			sequence,
			root,
			array.multiply<depthOf<sequence>, depthOf<root>["length"]>
		>

type pushToUnion<
	union extends PatternTree,
	root extends PatternTree,
	depth extends 1[]
> =
	longerThan<depth, ArkEnv.maxDepth> extends true ?
		SequenceTree<[union, string], depthOf<union>>
	:	SequenceTree<[union, root], depth>

type pushToSequence<sequence extends SequenceTree, root extends PatternTree> =
	sequence extends SequenceTree.Empty ? root
	: root extends string ?
		SequenceTree<[...sequence["children"], root], sequence["depth"]>
	: root extends SequenceTree ?
		pushSequenceToSequence<
			sequence,
			root,
			array.multiply<sequence["depth"], root["depth"]["length"]>
		>
	: root extends UnionTree ?
		pushUnionToSequence<
			sequence,
			root,
			array.multiply<sequence["depth"], root["depth"]["length"]>
		>
	:	never

type pushUnionToSequence<
	sequence extends SequenceTree,
	union extends UnionTree,
	depth extends 1[]
> =
	longerThan<depth, ArkEnv.maxDepth> extends true ?
		SequenceTree<[...sequence["children"], string], sequence["depth"]>
	:	SequenceTree<[...sequence["children"], union], depth>

type pushSequenceToSequence<
	sequence extends SequenceTree,
	append extends SequenceTree,
	depth extends 1[]
> =
	longerThan<depth, ArkEnv.maxDepth> extends true ?
		SequenceTree<[...sequence["children"], string], sequence["depth"]>
	:	SequenceTree<[...sequence["children"], ...append["children"]], depth>

export type depthOf<tree> =
	tree extends { depth: infer depth extends 1[] } ? depth : [1]

// add an initial dummy element to align with the 1-based indexing of capture
// groups maintained in state
type finalizeCaptures<captures> = _finalizeCaptures<captures, [never]>

type _finalizeCaptures<captures, finalized extends unknown[]> =
	finalized["length"] extends keyof captures ?
		_finalizeCaptures<
			captures,
			[...finalized, anchorsAway<finalizeTree<captures[finalized["length"]]>>]
		>
	:	tailOf<finalized>

type finalizeNamedCaptures<captures> = {
	[k in keyof captures as k extends string ? k : never]: anchorsAway<
		finalizeTree<captures[k]>
	>
} & unknown

type finalizeTree<tree> =
	tree extends string ? tree
	: tree extends SequenceTree ? SequenceTree.finalize<tree>
	: tree extends UnionTree ? UnionTree.finalize<tree>
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
