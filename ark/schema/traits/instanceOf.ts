import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./constraint.js"

export interface InstanceOfDefinition<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseDefinition {
	readonly value: constructor
}

export class InstanceOfNode<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends RuleNode<InstanceOfDefinition<constructor>> {
	readonly kind = "instanceOf"

	protected reduceRules(other: InstanceOfNode) {
		return !other.hasKind("instanceOf")
			? null
			: constructorExtends(this.value, other.value)
			? this
			: constructorExtends(other.value, this.value)
			? // other extends this rule, so the cast is safe
			  (other as InstanceOfNode<constructor>)
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
