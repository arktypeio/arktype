import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"
import { Disjoint } from "../disjoint.js"

export interface PrototypeRule extends BaseRule {
	readonly ancestor: AbstractableConstructor
}

export class PrototypeNode extends BaseNode<
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
