import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, BaseConstraints } from "../node.js"
import { BaseNode } from "../node.js"
import { ConstraintSet } from "./constraint.js"

export interface PrototypeRule extends BaseConstraints {
	readonly ancestor: AbstractableConstructor
}

export class PrototypeNode extends BaseNode<
	typeof PrototypeNode,
	PrototypeRule,
	BaseAttributes
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

export const PrototypeSet = ConstraintSet<readonly PrototypeNode[]>

export type PrototypeSet = InstanceType<typeof PrototypeSet>

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
