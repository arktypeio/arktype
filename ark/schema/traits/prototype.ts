import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseConstraintParameters } from "./constraint.js"
import { composeConstraint } from "./constraint.js"

export class PrototypeConstraint<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends composeConstraint<AbstractableConstructor>((l, r) =>
	constructorExtends(l, r)
		? [l]
		: constructorExtends(r, l)
		? [r]
		: Disjoint.from("prototype", l, r)
) {
	readonly kind = "prototype"

	declare rule: rule
	declare infer: InstanceType<rule>

	constructor(...args: BaseConstraintParameters<rule>) {
		super(...args)
	}

	hash(): string {
		return ""
	}

	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule}`
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
