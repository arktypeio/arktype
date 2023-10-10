import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Prevalidated } from "../node.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface ProtoChildren<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	proto: constructor
}

export type ProtoInput<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = constructor | ProtoChildren<constructor>

export class ProtoNode<
	proto extends AbstractableConstructor = AbstractableConstructor
> extends BaseConstraint<ProtoChildren> {
	readonly kind = "proto"

	declare infer: InstanceType<proto>

	constructor(
		schema: proto | ProtoChildren<proto>,
		prevalidated?: Prevalidated
	) {
		super(typeof schema === "function" ? { proto: schema } : schema)
	}

	protected possibleObjectKind = getExactBuiltinConstructorName(this.proto)

	hash() {
		return this.possibleObjectKind ?? compileSerializedValue(this.proto)
	}

	writeDefaultDescription() {
		return this.possibleObjectKind
			? objectKindDescriptions[this.possibleObjectKind]
			: `an instance of ${this.proto}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.proto, constructor)
		)
	}

	intersectSymmetric(other: ConstraintNode) {
		return other.kind !== "proto"
			? null
			: constructorExtends(this.proto, other.proto)
			? this.children
			: constructorExtends(other.proto, this.proto)
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
