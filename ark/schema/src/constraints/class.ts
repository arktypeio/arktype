import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface InstanceOfConstraint extends ConstraintRule {
	readonly class: AbstractableConstructor
}

export class InstanceOfNode extends ConstraintNode<
	InstanceOfConstraint,
	typeof InstanceOfNode
> {
	static writeDefaultDescription(rule: InstanceOfConstraint) {
		const possibleObjectKind = getExactBuiltinConstructorName(rule.class)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${rule.class.name}`
	}

	intersectOwnKeys(other: InstanceOfNode) {
		return constructorExtends(this.class, other.class)
			? this
			: constructorExtends(other.class, this.class)
			? other
			: Disjoint.from("class", this, other)
	}
}

export const InstanceOfSet = ConstraintSet<readonly [InstanceOfNode]>

export type InstanceOfSet = typeof InstanceOfSet

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
