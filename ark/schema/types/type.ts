import { compose } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { Fingerprinted, Kinded } from "../node.js"
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

export abstract class TypeRoot extends compose(
	Describable,
	Kinded,
	Fingerprinted
) {
	abstract infer: unknown

	abstract rule: unknown

	abstract references(): readonly Root[]

	abstract intersect<other>(
		other: Root<other> // TODO: inferIntersection
	): Root<t & other> | Disjoint

	abstract keyof(): Root

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
