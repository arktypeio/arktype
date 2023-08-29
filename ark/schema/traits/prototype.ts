import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { type BaseConstraint, constraint } from "./constraint.js"

export interface PrototypeConstraint<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseConstraint<constructor> {}

export const prototype = constraint<PrototypeConstraint>((l, r) =>
	constructorExtends(l, r) ? [l] : constructorExtends(r, l) ? [r] : []
)({
	kind: "prototype",
	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule}`
	}
})

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
