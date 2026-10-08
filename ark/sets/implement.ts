import { flatMorph } from "@ark/util"
import {
	schemaKindsRightOf,
	type BaseNodeDeclaration,
	type BaseScope,
	type Disjoint,
	type IntersectionMap,
	type RootIntersection,
	type RootKind,
	type UnknownIntersectionMap,
	type nodeOfKind,
	type schemaKindRightOf
} from "@ark/schema"

interface CommonSetImplementationInput<d extends BaseNodeDeclaration> {
	reduce?: (
		inner: d["inner"],
		$: BaseScope
	) => nodeOfKind<d["reducibleTo"]> | Disjoint | undefined
}

export type setImplementationOf<d extends BaseNodeDeclaration> =
	CommonSetImplementationInput<d> & {
		intersections: IntersectionMap<d["kind"]>
	} &
		// if the node is declared as reducible to a kind other than its own,
		// there must be a reduce implementation
		(d["reducibleTo"] extends d["kind"] ? {} : { reduce: {} })

export interface UnknownSetImplementation
	extends CommonSetImplementationInput<BaseNodeDeclaration> {
	intersections: UnknownIntersectionMap
}

export const defineRightwardIntersections = <kind extends RootKind>(
	kind: kind,
	implementation: RootIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: RootIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never
