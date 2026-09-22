import { flatMorph, type show } from "@ark/util"
import {
	schemaKindsRightOf,
	type BaseNode,
	type BaseNodeDeclaration,
	type BaseRoot,
	type BaseScope,
	type ConstraintKind,
	type Disjoint,
	type NodeKind,
	type RootKind,
	type kindOrRightOf,
	type kindRightOf,
	type nodeOfKind,
	type schemaKindOrRightOf,
	type schemaKindRightOf
} from "@ark/schema"

export interface IntersectionContext {
	$: BaseScope
	invert: boolean
	pipe: boolean
}

export type ConstraintIntersection<
	lKind extends ConstraintKind,
	rKind extends kindOrRightOf<lKind>
> = (
	l: nodeOfKind<lKind>,
	r: nodeOfKind<rKind>,
	ctx: IntersectionContext
) => BaseNode | Disjoint | null

export type ConstraintIntersectionMap<kind extends ConstraintKind> = show<
	{
		[_ in kind]: ConstraintIntersection<kind, kind>
	} & {
		[rKind in kindRightOf<kind>]?: ConstraintIntersection<kind, rKind>
	}
>

export type RootIntersection<
	lKind extends RootKind,
	rKind extends schemaKindOrRightOf<lKind>
> = (
	l: nodeOfKind<lKind>,
	r: nodeOfKind<rKind>,
	ctx: IntersectionContext
) => BaseRoot | Disjoint

export type TypeIntersectionMap<kind extends RootKind> = {
	[rKind in schemaKindOrRightOf<kind>]: RootIntersection<kind, rKind>
}

export type IntersectionMap<kind extends NodeKind> =
	kind extends RootKind ? TypeIntersectionMap<kind>
	:	ConstraintIntersectionMap<kind & ConstraintKind>

export type UnknownIntersectionMap = {
	[k in NodeKind]?: (
		l: BaseNode,
		r: BaseNode,
		ctx: IntersectionContext
	) => UnknownIntersectionResult
}

export type UnknownIntersectionResult = BaseNode | Disjoint | null

export type Reduction<d extends BaseNodeDeclaration> = (
	inner: d["inner"],
	$: BaseScope
) => nodeOfKind<d["reducibleTo"]> | Disjoint | undefined

/**
 * The relational half of a node kind's implementation: how it intersects with
 * each kind to its right in precedence order, and how a parsed inner reduces
 * to its canonical form.
 *
 * They live apart from `implementNode` so that the schema language is never
 * what makes them reachable: an artifact that never compares two types can
 * load the nodes without the algebra.
 */
export type setImplementationOf<d extends BaseNodeDeclaration> = {
	intersections: IntersectionMap<d["kind"]>
} & (d["reducibleTo"] extends d["kind"] ? { reduce?: Reduction<d> }
:	// if the node is declared as reducible to a kind other than its own,
	// there must be a reduce implementation
	{ reduce: Reduction<d> })

export interface UnknownSetImplementation {
	intersections: UnknownIntersectionMap
	reduce?: (inner: any, $: BaseScope) => BaseNode | Disjoint | undefined
}

export const defineRightwardIntersections = <kind extends RootKind>(
	kind: kind,
	implementation: RootIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: RootIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
