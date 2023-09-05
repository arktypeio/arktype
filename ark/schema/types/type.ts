import { compose } from "@arktype/util"
import { Describable } from "../attributes/description.js"
import { Disjoint } from "../disjoint.js"
import { Hashable, Kinded } from "../node.js"
import { inferred } from "../utils.js"
import { Predicate } from "./predicate.js"
import { intersectBranches, Union } from "./union.js"

export type TypeRootsByKind = {
	predicate: Predicate
	union: Union
}

export type TypeKind = keyof TypeRootsByKind

export abstract class TypeRoot<t = unknown> extends compose(
	Describable,
	Kinded,
	Hashable
) {
	declare infer: t;
	declare [inferred]: t

	abstract rule: unknown

	abstract references(): readonly TypeRoot[]

	abstract keyof(): TypeRoot

	branches: readonly Predicate[] = this.hasKind("union")
		? this.rule
		: [this as {} as Predicate]

	allows(data: unknown) {
		return true
	}

	intersect<other extends TypeRoot>(
		other: other // TODO: inferIntersection
	):
		| ([this, other] extends [Predicate, Predicate]
				? Predicate<this["infer"] & other["infer"]>
				: TypeRoot<this["infer"] & other["infer"]>)
		| Disjoint
	intersect(
		other: TypeRoot<any> // TODO: inferIntersection
	): TypeRoot<any> | Disjoint {
		const resultBranches = intersectBranches(this.branches, other.branches)
		return resultBranches.length === 0
			? Disjoint.from("union", this.branches, other.branches)
			: resultBranches.length === 1
			? resultBranches[0]
			: new Union(resultBranches)
	}

	isUnknown(): this is Predicate<unknown> {
		return this.hasKind("predicate") && this.constraints.length === 0
	}

	isNever(): this is Union<never> {
		return this.hasKind("union") && this.rule.length === 0
	}

	array() {
		return new Predicate({})
	}

	extends<other>(other: TypeRoot<other>): this is TypeRoot<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}
