import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface PrototypeSchema<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends ConstraintSchema {
	rule: constructor
}

export class PrototypeNode<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends ConstraintNode<PrototypeSchema<constructor>, typeof PrototypeNode> {
	readonly kind = "prototype"

	static parse(input: AbstractableConstructor | PrototypeSchema) {
		return typeof input === "function" ? { rule: input } : input
	}

	protected possibleObjectKind = getExactBuiltinConstructorName(this.rule)

	hash() {
		return this.possibleObjectKind ?? compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		return this.possibleObjectKind
			? objectKindDescriptions[this.possibleObjectKind]
			: `an instance of ${this.rule}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is PrototypeNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}

	reduceWith(other: Constraint) {
		return other.kind !== "prototype"
			? null
			: constructorExtends(this.rule, other.rule)
			? this
			: constructorExtends(other.rule, this.rule)
			? // this cast is safe since we know other's constructor extends this one
			  (other as PrototypeNode<constructor>)
			: Disjoint.from("prototype", this, other)
	}
}

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// compile() {
// 	return `${In} instanceof ${
// 		getExactBuiltinConstructorName(this.rule) ??
// 		registry().register(this.rule)
// 	}`
// }
