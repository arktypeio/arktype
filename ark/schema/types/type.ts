import { compose, implement, Trait } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseNode, nodeConstructor } from "../node.js"
import { Aliasable } from "../traits/alias.js"
import { Describable } from "../traits/description.js"
import { DomainConstraint } from "../traits/domain.js"
import { PredicateNode } from "./predicate.js"
import { Union } from "./union.js"

export const typeDefinitions = {
	predicate: PredicateNode,
	union: Union
}

export type TypeDefinitions = typeof typeDefinitions

export type TypeKind = keyof TypeDefinitions

// TODO: test external types if this isn't any
export type Root<t = any> = Union<t> | PredicateNode<t>

export const root = <root extends BaseRoot>() =>
	implement(Describable, Aliasable, BaseRoot) as nodeConstructor<
		root,
		typeof BaseRoot
	>

export abstract class BaseRoot<t = unknown> extends compose(
	Describable,
	Aliasable,
	Trait<{
		references(): readonly BaseNode[]
		intersect<other>(
			other: Root<other> // TODO: inferIntersection
		): Root<t & other> | Disjoint
		keyof(): Root
	}>
) {
	declare infer: t

	isUnknown(): this is PredicateNode<unknown> {
		return this.hasKind("predicate") && this.constraints.length === 0
	}

	isNever(): this is Union<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	array() {
		return new PredicateNode([new DomainNode({ value: "object" })])
	}

	extends<other>(other: Root<other>): this is Root<other> {
		const intersection = this.intersect(other)
		return intersection instanceof Root && this.equals(intersection)
	}
}
