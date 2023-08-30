import type { AbstractableConstructor, Trait } from "@arktype/util"
import { implement } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { BaseNode, type nodeConstructor } from "../node.js"
import { Aliasable } from "../traits/alias.js"
import { Describable } from "../traits/description.js"
import type { Predicate } from "./predicate.js"
import { predicate } from "./predicate.js"
import type { Union } from "./union.js"

export type RootDefinitions = {
	predicate: Predicate
	union: Union
}

export type TypeKind = keyof RootDefinitions

// TODO: test external types if this isn't any
export type Root<t = any> = Union<t> | Predicate<t>

export const root = <root extends Root>(
	...traits: readonly AbstractableConstructor<Trait>[]
) => implement(Describable, Aliasable, Typed) as nodeConstructor<root, Typed>

interface TypedAbstracts {
	infer: unknown
	rule: unknown
	references(): readonly Root[]
	intersect<other>(
		other: Root<other> // TODO: inferIntersection
	): Root<this["infer"] & other> | Disjoint
	keyof(): Root
}

export abstract class Typed<t = unknown> extends BaseNode<TypedAbstracts> {
	declare infer: t

	isUnknown(): this is Predicate<unknown> {
		return this.hasKind("predicate") && this.rule.length === 0
	}

	isNever(): this is Union<never> {
		return this.hasKind("union") && this.rule.length === 0
	}

	array() {
		return predicate([new DomainNode({ value: "object" })])
	}

	extends<other>(other: Root<other>): this is Root<other> {
		const intersection = this.intersect(other)
		return intersection instanceof Root && this.equals(intersection)
	}
}
