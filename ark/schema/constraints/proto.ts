import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface ProtoChildren<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	readonly rule: rule
}

export type ProtoSchema<
	rule extends AbstractableConstructor = AbstractableConstructor
> = rule | ProtoChildren

export class ProtoNode<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseConstraint<ProtoChildren> {
	readonly kind = "proto"

	declare infer: InstanceType<rule>

	possibleObjectKind = getExactBuiltinConstructorName(this.rule)
	defaultDescription = this.possibleObjectKind
		? objectKindDescriptions[this.possibleObjectKind]
		: `an instance of ${this.rule}`

	static from<rule extends AbstractableConstructor>(schema: ProtoSchema<rule>) {
		return new ProtoNode<rule>(
			typeof schema === "function" ? { rule: schema } : schema
		)
	}

	applicableTo(basis: Node<BasisKind> | undefined): basis is undefined {
		return basis === undefined
	}

	hash() {
		return this.possibleObjectKind ?? compileSerializedValue(this.rule)
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}

	intersectSymmetric(other: ProtoNode): ProtoNode | Disjoint {
		return constructorExtends(this.rule, other.rule)
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
