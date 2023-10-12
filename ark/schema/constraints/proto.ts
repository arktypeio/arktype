import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes } from "../node.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface ProtoSchemaObject<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	rule: rule
}

export type ProtoSchema<
	rule extends AbstractableConstructor = AbstractableConstructor
> = rule | ProtoChildren<rule>

export type ProtoChildren<
	rule extends AbstractableConstructor = AbstractableConstructor
> = ProtoSchemaObject<rule>

export class ProtoNode<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseConstraint<ProtoChildren> {
	readonly kind = "proto"

	declare infer: InstanceType<rule>

	constructor(schema: rule | ProtoChildren<rule>) {
		super(typeof schema === "function" ? { rule: schema } : schema)
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
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}

	intersectSymmetric(other: ConstraintNode) {
		return other.kind !== "proto"
			? null
			: constructorExtends(this.rule, other.rule)
			? this.children
			: constructorExtends(other.rule, this.rule)
			? other.children
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
