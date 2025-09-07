import type {
	contains,
	ErrorMessage,
	join,
	leftIfEqual,
	noSuggest,
	NumberLiteral,
	setIndex,
	tailOf,
	unionKeyOf,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { writeUnresolvableBackreferenceMessage } from "./escape.ts"
import type { quantify, QuantifyingChar } from "./quantify.ts"
import type {
	Flags,
	IndexedCaptures,
	NamedCaptures,
	Regex,
	RegexContext
} from "./regex.ts"

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
		sequence: SequenceTree.Empty
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
		branches: RegexAst[]
		sequence: RegexAst
		root: RegexAst
		caseInsensitive: boolean
	}

	export namespace Group {
		export type from<g extends Group> = g

		type pop<init extends Group, last extends Group[]> = [...last, init]

		export type finalize<g extends Group> =
			g["branches"] extends [] ? pushQuantifiable<g["sequence"], g["root"]>
			: [...g["branches"], pushQuantifiable<g["sequence"], g["root"]>] extends (
				infer branches extends RegexAst[]
			) ?
				finalizeUnion<branches, []>
			:	never

		type finalizeUnion<
			remaining extends RegexAst[],
			flattened extends RegexAst[]
		> =
			remaining extends (
				[infer head extends RegexAst, ...infer tail extends RegexAst[]]
			) ?
				head extends UnionTree<infer headBranches> ?
					finalizeUnion<tail, [...flattened, ...headBranches]>
				:	finalizeUnion<tail, [...flattened, head]>
			:	UnionTree<flattened>
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
		capture: never
		branches: []
		sequence: SequenceTree.Empty
		root: ""
		caseInsensitive: false
		flags: ""
	}>

	export type shiftQuantifiable<
		s extends State,
		root extends RegexAst,
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
		quantified extends RegexAst,
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
			{
				kind: "quantifier"
				ast: s["root"]
				min: min
				max: max
			}
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
		sequence: SequenceTree.Empty
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
		sequence: SequenceTree.Empty
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
				root: s["capture"] extends CapturedGroupKind ?
					GroupTree<State.Group.finalize<s>, s["capture"]>
				: s["capture"] extends State.UnnamedCaptureKind.lookaround ? ""
				: // non-capturing
					State.Group.finalize<s>
				caseInsensitive: last["caseInsensitive"]
				flags: s["flags"]
			}>
		:	s.error<writeUnmatchedGroupCloseMessage<")", unscanned>>

	export type finalize<s extends State> =
		s["groups"] extends [unknown, ...unknown[]] ?
			ErrorMessage<writeUnclosedGroupMessage<")">>
		:	finalizeRegexOrError<
				finalizeTree<
					State.Group.finalize<s>,
					{
						captures: EmptyCaptures
						names: {}
						flags: s["flags"]
						errors: []
					}
				>
			>

	type finalizeRegexOrError<r extends FinalizationResult> =
		r["ctx"]["errors"] extends [] ?
			applyAnchors<r["pattern"]> extends infer pattern extends string ?
				// check the negation in case pattern is a union in which some
				// branches contain invalid anchors
				contains<pattern, StartAnchorMarker> extends false ?
					contains<pattern, EndAnchorMarker> extends false ?
						Regex<pattern, finalizeContext<r["ctx"]>>
					:	ErrorMessage<writeMidAnchorError<"$">>
				:	ErrorMessage<writeMidAnchorError<"^">>
			:	never
		:	// if there were errors, return the first one
			r["ctx"]["errors"][0]

	type finalizeContext<ctx extends FinalizationContext> =
		ctx["captures"] extends EmptyCaptures ? finalizeContextWithoutCaptures<ctx>
		:	finalizeContextWithCaptures<{
				// re-align 1-based indexing for capture groups to 0-based for
				// external display
				captures: ctx["captures"] extends (
					[IndexedCaptureOffset, ...infer rest extends IndexedCaptures]
				) ?
					rest
				:	never
				names: ctx["names"]
				flags: ctx["flags"]
				errors: ctx["errors"]
			}>

	type finalizeContextWithoutCaptures<ctx extends FinalizationContext> =
		ctx["flags"] extends "" ? {}
		:	{
				flags: ctx["flags"]
			}

	type finalizeContextWithCaptures<ctx extends FinalizationContext> =
		keyof ctx["names"] extends never ?
			ctx["flags"] extends "" ?
				{ captures: ctx["captures"] }
			:	{ captures: ctx["captures"]; flags: ctx["flags"] }
		: ctx["flags"] extends "" ?
			{
				captures: ctx["captures"]
				names: ctx["names"]
			}
		:	{
				captures: ctx["captures"]
				names: ctx["names"]
				flags: ctx["flags"]
			}
}

export type RegexAst =
	| string
	| ReferenceNode
	| UnionTree
	| SequenceTree
	| GroupTree
	| QuantifierTree

export interface ReferenceNode<to extends string = string> {
	kind: "reference"
	to: to
}

type printIndexCaptures<
	captures extends IndexedCaptures,
	result extends string = "["
> =
	captures extends (
		readonly [
			infer head extends string | undefined,
			...infer tail extends IndexedCaptures
		]
	) ?
		printIndexCaptures<tail, `${result}${head},`>
	:	`${result}]`

export declare namespace ReferenceNode {
	export type finalize<
		self extends ReferenceNode,
		ctx extends FinalizationContext,
		// ensure `to` distributes
		to extends string = self["to"]
	> =
		to extends NumberLiteral & keyof ctx["captures"] ?
			ctx["captures"][to] extends IncompleteCaptureGroup ?
				// referencing an unclosed group is a no-op, so error
				// to help users avoid it
				FinalizationResult.error<ctx, writeIncompleteReferenceError<to>>
			:	FinalizationResult.from<{
					pattern: inferReference<ctx["captures"][to]>
					ctx: ctx
				}>
		: to extends keyof ctx["names"] ?
			ctx["names"][to] extends IncompleteCaptureGroup ?
				FinalizationResult.error<ctx, writeIncompleteReferenceError<to>>
			:	FinalizationResult.from<{
					pattern: inferReference<ctx["names"][to]>
					ctx: ctx
				}>
		:	FinalizationResult.error<ctx, writeUnresolvableBackreferenceMessage<to>>

	type inferReference<to extends string | undefined> =
		to extends string ? to : ""
}

export const writeIncompleteReferenceError = <ref extends string>(
	ref: ref
): writeIncompleteReferenceError<ref> =>
	`Reference to incomplete group '${ref}' has no effect`

export type writeIncompleteReferenceError<ref extends string> =
	`Reference to incomplete group '${ref}' has no effect`

export interface SequenceTree<ast extends RegexAst[] = RegexAst[]> {
	kind: "sequence"
	ast: ast
}

export declare namespace SequenceTree {
	export type Empty = SequenceTree<[]>

	export type finalize<
		self extends SequenceTree,
		ctx extends FinalizationContext
	> = _finalize<self["ast"], "", ctx>

	type _finalize<
		tree extends unknown[],
		pattern extends string,
		ctx extends FinalizationContext
	> =
		tree extends [infer head, ...infer tail] ?
			finalizeTree<head, ctx> extends infer r ?
				r extends FinalizationResult ?
					// preserve the distribution from Group.finalize
					_finalize<tail, appendNonRedundant<pattern, r["pattern"]>, r["ctx"]>
				:	never
			:	never
		:	FinalizationResult.from<{
				pattern: pattern
				ctx: ctx
			}>
}

export interface UnionTree<ast extends RegexAst[] = RegexAst[]> {
	kind: "union"
	ast: ast
}

export declare namespace UnionTree {
	export type finalize<
		self extends UnionTree,
		ctx extends FinalizationContext
	> = _finalize<self["ast"], [], ctx>

	type FinalizedBranch = {
		pattern: string
		captures: IndexedCaptures
		names: NamedCaptures
	}

	namespace FinalizedBranch {
		export type from<b extends FinalizedBranch> = b
	}

	type _finalize<
		astBranches extends unknown[],
		acc extends FinalizedBranch[],
		ctx extends FinalizationContext
	> =
		astBranches extends [infer head, ...infer tail] ?
			finalizeTree<head, ctx> extends infer r ?
				r extends FinalizationResult ?
					_finalize<tail, finalizeBranch<acc, ctx, r>, ctx>
				:	never
			:	never
		:	finalizeBranches<keyof acc, acc, ctx>

	type finalizeBranch<
		acc extends FinalizedBranch[],
		ctx extends FinalizationContext,
		r extends FinalizationResult
	> = [
		...acc,
		FinalizedBranch.from<{
			pattern: r["pattern"]
			captures: finalizeBranchCaptures<acc, ctx, r>
			names: r["ctx"]["names"]
		}>
	]

	type finalizeBranchCaptures<
		acc extends FinalizedBranch[],
		ctx extends FinalizationContext,
		r extends FinalizationResult,
		branchCaptures extends IndexedCaptures = extractNewCaptures<
			ctx["captures"],
			r["ctx"]["captures"]
		>
	> =
		acc extends [] ? branchCaptures
		: acc[0]["captures"] extends (
			infer firstCaptureBranch extends IndexedCaptures
		) ?
			branchCaptures extends [] ?
				{ [i in keyof firstCaptureBranch]: undefined }
			:	[...{ [i in keyof firstCaptureBranch]: undefined }, ...branchCaptures]
		:	never

	type finalizeBranches<
		i,
		acc extends FinalizedBranch[],
		ctx extends FinalizationContext
	> =
		i extends keyof acc & NumberLiteral ?
			FinalizationResult.from<{
				pattern: acc[i]["pattern"]
				ctx: {
					flags: ctx["flags"]
					captures: [...ctx["captures"], ...acc[i]["captures"]]
					names: {
						[k in unionKeyOf<acc[number]["names"]>]: k extends (
							keyof acc[i]["names"]
						) ?
							acc[i]["names"][k]
						:	undefined
					}
					errors: ctx["errors"]
				}
			}>
		:	never
}

export type CapturedGroupKind = string | State.UnnamedCaptureKind.indexed

export type IncompleteCaptureGroup = noSuggest<"incompleteCaptureGroup">

export type IndexedCaptureOffset = " indexedCaptureOffset"

/**
 * Offset captures to match 1-based indexing for references
 * (i.e so that \1 would match the first capture group)
 */
export type EmptyCaptures = [IndexedCaptureOffset]

export interface GroupTree<
	ast extends RegexAst = RegexAst,
	capture extends CapturedGroupKind = CapturedGroupKind
> {
	kind: "group"
	capture: capture
	ast: ast
}

export declare namespace GroupTree {
	export type finalize<
		self extends GroupTree,
		ctx extends FinalizationContext
	> =
		finalizeGroupAst<self, ctx> extends infer r ?
			// allow the result to distribute to a particular branch
			// to preserve associations between groups and references
			// so that e.g. "(a|b)\\1" is inferred as "aa" | "bb"
			// as opposed to "aa" | "ab" | "ba" | "bb"
			r extends FinalizationResult ?
				finalizeGroupResult<self, ctx, r>
			:	never
		:	never

	type finalizeGroupAst<
		self extends GroupTree,
		ctx extends FinalizationContext
	> = finalizeTree<
		self["ast"],
		self["capture"] extends string ?
			{
				// IncompleteCaptureGroup represents a capture group that is still being parsed
				// error on trying to reference it (will always be empty)
				captures: [...ctx["captures"], IncompleteCaptureGroup]
				names: ctx["names"] & { [_ in self["capture"]]: IncompleteCaptureGroup }
				flags: ctx["flags"]
				errors: ctx["errors"]
			}
		: self["capture"] extends State.UnnamedCaptureKind.indexed ?
			{
				captures: [...ctx["captures"], IncompleteCaptureGroup]
				names: ctx["names"]
				flags: ctx["flags"]
				errors: ctx["errors"]
			}
		:	ctx
	>

	type finalizeGroupResult<
		self extends GroupTree,
		ctx extends FinalizationContext,
		r extends FinalizationResult
	> = FinalizationResult.from<{
		pattern: r["pattern"]
		ctx: self["capture"] extends string ?
			finalizeNamedCapture<
				self["capture"],
				ctx["captures"]["length"],
				r["pattern"],
				r["ctx"]
			>
		: self["capture"] extends State.UnnamedCaptureKind.indexed ?
			finalizeUnnamedCapture<ctx["captures"]["length"], r["pattern"], r["ctx"]>
		:	r["ctx"]
	}>

	type finalizeNamedCapture<
		name extends string,
		index extends number,
		pattern extends string,
		ctx extends FinalizationContext
	> = FinalizationContext.from<{
		// replace undefined (representing a group being parsed)
		// with the inferred reference
		captures: setIndex<ctx["captures"], index, anchorsAway<pattern>>
		names: {
			[k in keyof ctx["names"]]: k extends name ? anchorsAway<pattern>
			:	ctx["names"][k]
		}
		flags: ctx["flags"]
		errors: ctx["errors"]
	}>

	type finalizeUnnamedCapture<
		index extends number,
		pattern extends string,
		ctx extends FinalizationContext
	> = FinalizationContext.from<{
		captures: setIndex<ctx["captures"], index, anchorsAway<pattern>>
		names: ctx["names"]
		flags: ctx["flags"]
		errors: ctx["errors"]
	}>
}

export interface QuantifierTree<ast extends RegexAst = RegexAst> {
	kind: "quantifier"
	ast: ast
	min: number
	max: number | null
}

export declare namespace QuantifierTree {
	export type finalize<
		self extends QuantifierTree,
		ctx extends FinalizationContext
	> =
		finalizeTree<self["ast"], ctx> extends infer r ?
			r extends FinalizationResult ?
				finalizeQuantifierResult<self, ctx, r>
			:	never
		:	never

	type finalizeQuantifierResult<
		self extends QuantifierTree,
		ctx extends FinalizationContext,
		r extends FinalizationResult
	> =
		self["min"] extends 0 ? finalizeZeroMinQuantified<self, ctx, r>
		:	finalizeNonZeroMinQuantified<self, r>

	type finalizeNonZeroMinQuantified<
		self extends QuantifierTree,
		r extends FinalizationResult
	> = FinalizationResult.from<{
		pattern: quantify<r["pattern"], self["min"], self["max"]>
		ctx: r["ctx"]
	}>

	type finalizeZeroMinQuantified<
		self extends QuantifierTree,
		ctx extends FinalizationContext,
		r extends FinalizationResult
	> = finalizeZeroQuantified<ctx, r> | finalizeOnePlusQuantified<self["max"], r>

	// add `| undefined` to any capture groups quantified by zero
	type finalizeZeroQuantified<
		ctx extends FinalizationContext,
		r extends FinalizationResult,
		quantifiedCaptures extends unknown[] = extractNewCaptures<
			ctx["captures"],
			r["ctx"]["captures"]
		>
	> = FinalizationResult.from<{
		pattern: ""
		ctx: {
			captures: [
				...ctx["captures"],
				...{
					[i in keyof quantifiedCaptures]: undefined
				}
			]
			flags: r["ctx"]["flags"]
			// TODO: FIX
			names: zeroQuantifiedNames<ctx["names"], r["ctx"]["names"]>
			errors: r["ctx"]["errors"]
		}
	}>

	type finalizeOnePlusQuantified<
		max extends number | null,
		r extends FinalizationResult
	> =
		max extends 1 ? r
		:	FinalizationResult.from<{
				// don't include 0 since it has been inferred separately
				pattern: quantify<r["pattern"], 1, max>
				ctx: r["ctx"]
			}>
}

declare global {
	export interface ArkEnv {
		maxDepth(): 8191
	}

	export namespace ArkEnv {
		export type maxDepth = ReturnType<ArkEnv["maxDepth"]>
	}
}

export type pushQuantifiable<sequence extends RegexAst, root extends RegexAst> =
	root extends "" ? sequence
	: sequence extends string ?
		sequence extends "" ?
			root
		:	SequenceTree<[sequence, root]>
	: sequence extends SequenceTree ? pushToSequence<sequence, root>
	: SequenceTree<[sequence, root]>

type pushToSequence<sequence extends SequenceTree, root extends RegexAst> =
	sequence extends SequenceTree.Empty ? root
	: root extends SequenceTree ?
		SequenceTree<[...sequence["ast"], ...root["ast"]]>
	:	SequenceTree<[...sequence["ast"], root]>

type extractNewCaptures<
	base extends IndexedCaptures,
	result extends IndexedCaptures
> =
	result extends readonly [...base, ...infer elements extends IndexedCaptures] ?
		elements
	:	[]

type zeroQuantifiedNames<
	base extends NamedCaptures,
	result extends NamedCaptures
> = {
	[k in keyof result]: k extends keyof base ? result[k] : undefined
} & unknown

export interface FinalizationContext extends Required<RegexContext> {
	errors: ErrorMessage[]
}

export declare namespace FinalizationContext {
	export type from<ctx extends FinalizationContext> = ctx
}

export type FinalizationResult = {
	pattern: string
	ctx: FinalizationContext
}

export declare namespace FinalizationResult {
	export type from<r extends FinalizationResult> = r

	export type error<
		ctx extends FinalizationContext,
		message extends string
	> = from<{
		pattern: string
		ctx: {
			captures: ctx["captures"]
			names: ctx["names"]
			flags: ctx["flags"]
			errors: [...ctx["errors"], ErrorMessage<message>]
		}
	}>
}

// 	longerThan<depth, ArkEnv.maxDepth> extends true ?

type Tree = SequenceTree<
	[
		"a",
		{
			kind: "quantifier"
			ast: GroupTree<
				SequenceTree<
					["b", GroupTree<"c", State.UnnamedCaptureKind.indexed>, "d"]
				>,
				"foo"
			>
			min: 0
			max: 1
		}
		// "e",
		// ReferenceNode<"1">,
		// ReferenceNode<"2">
	]
>

type R = finalizeTree<
	Tree,
	{ errors: []; flags: ""; captures: [IndexedCaptureOffset]; names: {} }
>

type M = finalizeTree<
	GroupTree<
		SequenceTree<["b", GroupTree<"c", State.UnnamedCaptureKind.indexed>, "d"]>,
		"foo"
	>,
	{ errors: []; flags: ""; captures: [IndexedCaptureOffset]; names: {} }
>

type finalizeTree<tree, ctx extends FinalizationContext> =
	tree extends string ?
		FinalizationResult.from<{
			pattern: tree
			ctx: ctx
		}>
	: tree extends SequenceTree ? SequenceTree.finalize<tree, ctx>
	: tree extends UnionTree ? UnionTree.finalize<tree, ctx>
	: tree extends GroupTree ? GroupTree.finalize<tree, ctx>
	: tree extends QuantifierTree ? QuantifierTree.finalize<tree, ctx>
	: tree extends ReferenceNode ? ReferenceNode.finalize<tree, ctx>
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

export const writeMidAnchorError = <anchor extends Anchor>(
	anchor: anchor
): writeMidAnchorError<anchor> => `Anchor ${anchor} may not appear mid-pattern`

type writeMidAnchorError<anchor extends Anchor> =
	`Anchor ${anchor} may not appear mid-pattern`
