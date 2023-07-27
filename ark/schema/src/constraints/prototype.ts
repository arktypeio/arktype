import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface PrototypeRule extends ConstraintRule {
	readonly ancestor: AbstractableConstructor
}

export class PrototypeNode extends ConstraintNode<
	PrototypeRule,
	typeof PrototypeNode
> {
	static writeDefaultDescription(rule: PrototypeRule) {
		const possibleObjectKind = getExactBuiltinConstructorName(rule.ancestor)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${rule.ancestor.name}`
	}

	intersectOwnKeys(other: PrototypeNode) {
		return constructorExtends(this.ancestor, other.ancestor)
			? this
			: constructorExtends(other.ancestor, this.ancestor)
			? other
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
