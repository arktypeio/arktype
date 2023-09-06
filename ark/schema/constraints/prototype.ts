import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export class PrototypeConstraint extends ConstraintNode<{
	rule: AbstractableConstructor
}> {
	readonly kind = "prototype"

	hash() {
		return this.rule
	}

	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule}`
	}

	reduceWith(other: Constraint) {
		return other.kind !== "prototype"
			? null
			: constructorExtends(this.rule, other.rule)
			? this
			: constructorExtends(other.rule, this.rule)
			? other
			: Disjoint.from("prototype", this, other)
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
