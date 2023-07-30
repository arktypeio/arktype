import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { Constraint } from "./constraint.js"

export class ConstructorConstraint extends Constraint<AbstractableConstructor> {
	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule.name}`
	}

	intersectRules(other: ConstructorConstraint) {
		return constructorExtends(this.rule, other.rule)
			? this.rule
			: constructorExtends(other.rule, this.rule)
			? other.rule
			: Disjoint.from("class", this, other)
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
