import { morph, type Domain, type evaluate } from "@arktype/util"
import { BaseNode, type NodeSubclass } from "../base.js"
import type { reducibleKindOf } from "../kinds.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import {
	typeKindsRightOf,
	type IntersectionImplementation,
	type NodeKind,
	type TypeKind,
	type kindRightOf
} from "../shared/implement.js"

export type BaseTypeDeclaration = evaluate<
	BaseNodeDeclaration & { kind: TypeKind }
>

export const defineRightwardIntersections = <kind extends TypeKind>(
	kind: kind,
	implementation: IntersectionImplementation<kind, typeKindRightOf<kind>>
) => morph(typeKindsRightOf(kind), (i, kind) => [kind, implementation])

export abstract class BaseType<
	t,
	d extends BaseTypeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<t, d, subclass> {}

export type intersectType<l extends TypeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? l
	: asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends kindRightOf<l>
		? l | reducibleKindOf<l>
		: never
	: never

export interface BaseBasis {
	basisName: string
	domain: Domain
}

export type typeKindRightOf<kind extends TypeKind> = Extract<
	kindRightOf<kind>,
	TypeKind
>

export type typeKindOrRightOf<kind extends TypeKind> =
	| kind
	| typeKindRightOf<kind>
