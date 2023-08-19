import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { RuleNode } from "./rule.js"

export interface InstanceOfRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	readonly value: constructor
}

export class InstanceOfConstraint<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends RuleNode<InstanceOfRule<constructor>> {
	readonly kind = "instanceOf"

	protected reduceRules(other: InstanceOfConstraint) {
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
