import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import { ConstraintNode } from "./constraint.js"

export class InstanceOfConstraint extends ConstraintNode {
	readonly kind = "instanceOf"

	constructor(
		public rule: AbstractableConstructor,
		public attributes: UniversalAttributes = {}
	) {
		super()
	}

	protected reduceWithRuleOf(
		other: ConstraintNode
	): AbstractableConstructor | Disjoint | null {
		return !other.hasKind("instanceOf")
			? null
			: constructorExtends(this.rule, other.rule)
			? this.rule
			: constructorExtends(other.rule, this.rule)
			? other.rule
			: Disjoint.from("instanceOf", this, other)
	}

	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule.name}`
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
