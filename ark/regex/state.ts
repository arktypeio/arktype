import type {
	contains,
	ErrorMessage,
	leftIfEqual,
	setIndex,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	ZeroWidthSpace
} from "@ark/util"
import type { quantify, QuantifyingChar } from "./quantify.ts"
import type { Flags, Regex, RegexContext } from "./regex.ts"

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
		: finalizeTree<
			State.Group.finalize<s>,
			{
				captures: []
				names: {}
				flags: s["flags"]
			}
		> extends infer r extends FinalizationResult ?
			applyAnchors<r["pattern"]> extends infer pattern extends string ?
				// check the negation in case pattern is a union in which some
				// branches contain invalid anchors
				contains<pattern, StartAnchorMarker> extends false ?
					contains<pattern, EndAnchorMarker> extends false ?
						Regex<pattern, finalizeContext<r["ctx"]>>
					:	ErrorMessage<writeMidAnchorError<"$">>
				:	ErrorMessage<writeMidAnchorError<"^">>
			:	never
		:	never

	type finalizeContext<ctx extends FinalizationContext> =
		ctx["captures"] extends [] ?
			keyof ctx["names"] extends never ?
				ctx["flags"] extends "" ?
					{}
				:	{
						flags: ctx["flags"]
					}
			: ctx["flags"] extends "" ?
				{
					names: ctx["names"]
				}
			:	{
					names: ctx["names"]
					flags: ctx["flags"]
				}
		: keyof ctx["names"] extends never ?
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

export interface ReferenceNode<to extends string | number = string | number> {
	kind: "reference"
	to: to
}

export declare namespace ReferenceNode {
	export type finalize<
		self extends ReferenceNode,
		ctx extends FinalizationContext
	> = FinalizationResult.from<{
		pattern: `${self["to"]}`
		ctx: ctx
	}>
}

export interface CompositeTree<ast extends RegexAst[] = RegexAst[]> {
	ast: ast
}

export interface SequenceTree<ast extends RegexAst[] = RegexAst[]>
	extends CompositeTree<ast> {
	kind: "sequence"
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
			finalizeTree<head, ctx> extends infer r extends FinalizationResult ?
				_finalize<tail, appendNonRedundant<pattern, r["pattern"]>, r["ctx"]>
			:	never
		:	FinalizationResult.from<{
				pattern: pattern
				ctx: ctx
			}>
}

export interface UnionTree<ast extends RegexAst[] = RegexAst[]>
	extends CompositeTree<ast> {
	kind: "union"
}

export declare namespace UnionTree {
	export type finalize<
		self extends UnionTree,
		ctx extends FinalizationContext
	> = _finalize<self["ast"], never, ctx>

	type _finalize<
		branches extends unknown[],
		pattern extends string,
		ctx extends FinalizationContext
	> =
		branches extends [infer head, ...infer tail] ?
			finalizeTree<head, ctx> extends infer r extends FinalizationResult ?
				_finalize<tail, pattern | r["pattern"], r["ctx"]>
			:	never
		:	FinalizationResult.from<{
				pattern: pattern
				ctx: ctx
			}>
}

export type CapturedGroupKind = string | State.UnnamedCaptureKind.indexed

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
		finalizeTree<
			self["ast"],
			self["capture"] extends string ?
				{
					// in case the group references itself
					captures: [...ctx["captures"], ""]
					names: ctx["names"] & { [_ in self["capture"]]: string }
					flags: ctx["flags"]
				}
			: self["capture"] extends State.UnnamedCaptureKind.indexed ?
				{
					captures: [...ctx["captures"], string]
					names: ctx["names"]
					flags: ctx["flags"]
				}
			:	ctx
		> extends infer r extends FinalizationResult ?
			FinalizationResult.from<{
				pattern: r["pattern"]
				ctx: self["capture"] extends string ?
					{
						captures: setIndex<
							r["ctx"]["captures"],
							ctx["captures"]["length"],
							anchorsAway<r["pattern"]>
						>
						names: r["ctx"]["names"] & { [_ in self["capture"]]: r["pattern"] }
						flags: r["ctx"]["flags"]
					}
				: self["capture"] extends State.UnnamedCaptureKind.indexed ?
					{
						captures: setIndex<
							r["ctx"]["captures"],
							ctx["captures"]["length"],
							anchorsAway<r["pattern"]>
						>
						names: r["ctx"]["names"]
						flags: r["ctx"]["flags"]
					}
				:	r["ctx"]
			}>
		:	never
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
		finalizeTree<self["ast"], ctx> extends infer r extends FinalizationResult ?
			FinalizationResult.from<{
				pattern: quantify<r["pattern"], self["min"], self["max"]>
				ctx: r["ctx"]
			}>
		:	never

	// 	finalizeTree<head, ctx> extends infer r extends FinalizationResult ?
	// 		_finalize<tail, pattern | r["pattern"], r["ctx"]>
	// 	:	never
	// :	FinalizationResult.from<{
	// 		pattern: pattern
	// 		ctx: ctx
	// 	}>
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

export interface FinalizationContext extends Required<RegexContext> {}

export type FinalizationResult = {
	pattern: string
	ctx: FinalizationContext
}

export declare namespace FinalizationResult {
	export type from<r extends FinalizationResult> = r
}

// 	longerThan<depth, ArkEnv.maxDepth> extends true ?

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
