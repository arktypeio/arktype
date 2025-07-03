import type {
	array,
	contains,
	ErrorMessage,
	leftIfEqual,
	longerThan,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { QuantifyingChar } from "./quantify.ts"
import type { regex, Regex } from "./regex.ts"

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
			Regex<ErrorMessage<writeUnclosedGroupMessage<")">>>
		:	// prune<>
			State.Group.finalize<s>
	// Regex<
	// 		validateAnchorless<applyAnchors<finalizeTree<State.Group.finalize<s>>>>,
	// 		finalizeCaptures<s["captures"]>
	// 	>
}

type Z = prune<regex.parse<"(a|b|c)(c|d(e|f))g?h?">>

// ArkEnv.maxDepth
type prune<tree> =
	longerThan<depthOf<tree>, 11> extends true ? prune<pruneDeepest<tree>> : tree

type pruneDeepest<tree> =
	tree extends UnionTree<infer branches> ?
		pruneDeepestChild<
			branches,
			findDeepestChild<branches, SequenceTree.Empty>
		> extends infer unionParts ?
			UnionTree<unionParts, UnionTree.recomputeDepth<unionParts>>
		:	never
	: tree extends SequenceTree<infer parts> ?
		pruneDeepestChild<
			parts,
			findDeepestChild<parts, SequenceTree.Empty>
		> extends infer sequenceParts ?
			SequenceTree<sequenceParts, SequenceTree.recomputeDepth<sequenceParts>>
		:	never
	:	tree

type pruneDeepestChild<children extends PatternTree[], deepest> =
	// check from right to left so that if multiple instances of the
	// deepest child occur, those at the beginning of the string are preserved
	children extends (
		[...infer init extends PatternTree[], infer last extends PatternTree]
	) ?
		last extends deepest ?
			[
				...init, // prune largest leaf union to ${string}
				string //last extends UnionTree.Shallow ? string : prune<last>
			]
		:	[...pruneDeepestChild<init, deepest>, last]
	:	[]

type findDeepestChild<children, deepest extends CompositeTree> =
	children extends [...infer init, infer last] ?
		findDeepestChild<
			init,
			last extends CompositeTree ?
				longerThan<last["depth"], deepest["depth"]["length"]> extends true ?
					last
				:	deepest
			:	deepest
		>
	:	deepest

// while root depth is greater than max depth:
// 1. Traverse down deepest branch until sequence with leaf union
// 2. Prune largest leaf union to ${string} (check if all branches are strings)
// 3. Recompute depth back up the branch

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

	export type recomputeDepth<children extends PatternTree[]> = _recomputeDepth<
		children,
		[1]
	>

	type _recomputeDepth<children, depth extends 1[]> =
		children extends [infer head, ...infer tail] ?
			_recomputeDepth<tail, array.multiply<depth, depthOf<head>["length"]>>
		:	depth

	export type finalize<self extends SequenceTree> =
		longerThan<self["depth"], ArkEnv.maxDepth> extends true ?
			`sequence${self["depth"]["length"]}`
		:	_finalize<self["children"], self["depth"], "">

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
	export type recomputeDepth<children extends PatternTree[]> = _recomputeDepth<
		children,
		[]
	>

	type _recomputeDepth<children, depth extends 1[]> =
		children extends [infer head, ...infer tail] ?
			_recomputeDepth<tail, [...depth, ...depthOf<head>]>
		:	depth

	export type finalize<self extends UnionTree> =
		longerThan<self["depth"], ArkEnv.maxDepth> extends true ?
			`union${self["depth"]["length"]}`
		:	_finalize<self["children"], never>

	type _finalize<branches extends unknown[], pattern extends string> =
		branches extends [infer head, ...infer tail] ?
			_finalize<tail, pattern | finalizeTree<head>>
		:	pattern

	export type Shallow = UnionTree<string[]>
}

declare global {
	export interface ArkEnv {
		maxDepth(): 1000
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
	: sequence extends SequenceTree ?
		sequence extends SequenceTree.Empty ?
			root
		:	pushToSequence<sequence, root>
	:	SequenceTree<
			[sequence, root],
			array.multiply<depthOf<sequence>, depthOf<root>["length"]>
		>

export type pushToSequence<
	sequence extends SequenceTree,
	root extends PatternTree
> =
	root extends string ?
		SequenceTree<[...sequence["children"], root], sequence["depth"]>
	: root extends SequenceTree<infer rootSequence, infer rootDepth> ?
		SequenceTree<
			[...sequence["children"], ...rootSequence],
			array.multiply<sequence["depth"], rootDepth["length"]>
		>
	: root extends UnionTree<any, infer rootDepth> ?
		SequenceTree<
			[...sequence["children"], root],
			array.multiply<sequence["depth"], rootDepth["length"]>
		>
	:	never

export type depthOf<tree> =
	tree extends { depth: infer depth extends 1[] } ? depth : [1]

type finalizeCaptures<captures> = {
	[k in keyof captures]: anchorsAway<finalizeTree<captures[k]>>
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
