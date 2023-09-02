import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { composeConstraint } from "./constraint.js"

export class PrototypeConstraint<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends composeConstraint<AbstractableConstructor>((l, r) =>
	constructorExtends(l, r) ? [l] : constructorExtends(r, l) ? [r] : []
) {
	declare rule: constructor
	readonly kind = "prototype"

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
