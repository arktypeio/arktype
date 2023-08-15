import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { ConstraintNode } from "./constraint.js"

export class InstanceOfConstraint<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends ConstraintNode<rule> {
	readonly kind = "instanceOf"

	protected reduceWithRuleOf(other: ConstraintNode): rule | Disjoint | null {
		return !other.hasKind("instanceOf")
			? null
			: constructorExtends(this.rule, other.rule)
			? this.rule
			: constructorExtends(other.rule, this.rule)
			? // other extends this rule, so the cast is safe
			  (other.rule as rule)
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
