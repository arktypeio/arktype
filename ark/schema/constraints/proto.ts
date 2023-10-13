import type { AbstractableConstructor, BuiltinObjectKind } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface ProtoSchema<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	readonly rule: rule
}

class Foo {
	protected constructor() {}
}

export class ProtoNode<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseConstraint {
	readonly kind = "proto"

	declare infer: InstanceType<rule>
	readonly rule: rule
	protected possibleObjectKind: BuiltinObjectKind | undefined

	constructor(public schema: ProtoSchema<rule>) {
		super(schema)
		this.rule = schema.rule
		this.possibleObjectKind = getExactBuiltinConstructorName(this.rule)
	}

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
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}

	intersectSymmetric(other: Node<ConstraintKind>) {
		return other.kind !== "proto"
			? null
			: constructorExtends(this.rule, other.rule)
			? this
			: constructorExtends(other.rule, this.rule)
			? other
			: Disjoint.from("proto", this, other)
	}

	intersectAsymmetric() {
		return null
	}
}

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// compile() {
// 	return `${In} instanceof ${
// 		getExactBuiltinConstructorName(this.rule) ??
// 		registry().register(this.rule)
// 	}`
// }
