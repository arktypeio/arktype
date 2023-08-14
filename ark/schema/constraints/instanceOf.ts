import type { AbstractableConstructor, satisfy } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type InstanceOfNodeDefinition = satisfy<
	NodeDefinition,
	{
		kind: "instanceOf"
		rule: AbstractableConstructor
		attributes: UniversalAttributes
		instance: InstanceOfConstraint
	}
>

export class InstanceOfConstraint extends ConstraintNode<InstanceOfNodeDefinition> {
	readonly kind = "instanceOf"

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
