import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../type.js"

export class InstanceOfConstraint extends BaseNode<{
	rule: AbstractableConstructor
	attributes: {}
	intersections: Disjoint
}> {
	readonly kind = "instanceOf"
	readonly domain = "object"

	intersectRules(other: InstanceOfConstraint) {
		return constructorExtends(this.rule, other.rule)
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
