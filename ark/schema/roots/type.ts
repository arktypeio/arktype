import type { Disjoint } from "../disjoint.js"
import type { inferred } from "../utils.js"
import type { PredicateNode } from "./predicate.js"
import type { Union } from "./union.js"

export type RootsByKind = {
	predicate: PredicateNode
	union: Union
}

export type RootKind = keyof RootsByKind

export interface TypeRoot<t = unknown> {
	infer: t
	[inferred]: t

	references(): readonly TypeRoot[]

	keyof(): TypeRoot<keyof t>

	allows(data: unknown): boolean

	intersect<other extends TypeRoot>(
		other: other // TODO: inferIntersection
	): TypeRoot<this["infer"] & other["infer"]> | Disjoint

	isUnknown(): this is PredicateNode<unknown>

	isNever(): this is Union<never>

	array(): TypeRoot<t[]>

	extends<other>(other: TypeRoot<other>): this is TypeRoot<other>
}
