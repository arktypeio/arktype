import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseRule } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export interface InstanceOfRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseRule {
	readonly value: constructor
}

export class InstanceOfConstraint<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends ConstraintNode<InstanceOfRule<constructor>> {
	readonly kind = "instanceOf"

	protected reduceWithRuleOf(
		other: ConstraintNode
	): InstanceOfRule<constructor> | Disjoint | null {
		return !other.hasKind("instanceOf")
			? null
			: constructorExtends(this.value, other.value)
			? this
			: constructorExtends(other.value, this.value)
			? // other extends this rule, so the cast is safe
			  (other as InstanceOfConstraint<constructor>)
			: Disjoint.from("instanceOf", this, other)
	}

	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.value)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.value.name}`
	}
}

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// compile() {
// 	return `${In} instanceof ${
// 		getExactBuiltinConstructorName(this.rule) ??
// 		registry().register(this.rule)
// 	}`
// }

// extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
// 	return baseConstructors.some((ctor) => constructorExtends(this.rule, ctor))
// }
