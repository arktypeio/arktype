import type { AbstractableConstructor, conform } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	Hkt,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes } from "../type.js"
import { nodeParser } from "../type.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface PrototypeSchema<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	prototype: constructor
}

export type PrototypeInput = AbstractableConstructor | PrototypeSchema

export class PrototypeNode<
	schema extends PrototypeSchema = PrototypeSchema
> extends BaseConstraint<schema> {
	readonly kind = "prototype"

	declare infer: InstanceType<schema["prototype"]>

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], PrototypeInput>) => {
			return new PrototypeNode(
				typeof input === "function" ? { prototype: input } : input
			) as {} as typeof input extends PrototypeSchema
				? PrototypeNode<typeof input>
				: typeof input extends AbstractableConstructor
				? { rule: typeof input }
				: never
		}
	})()

	static from = nodeParser(this)

	protected possibleObjectKind = getExactBuiltinConstructorName(this.prototype)

	hash() {
		return this.possibleObjectKind ?? compileSerializedValue(this.prototype)
	}

	writeDefaultDescription() {
		return this.possibleObjectKind
			? objectKindDescriptions[this.possibleObjectKind]
			: `an instance of ${this.prototype}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is PrototypeNode<{ prototype: constructors[number] }> {
		return constructors.some((constructor) =>
			constructorExtends(this.prototype, constructor)
		)
	}

	intersectSymmetric(other: ConstraintNode) {
		return other.kind !== "prototype"
			? null
			: constructorExtends(this.prototype, other.prototype)
			? this.schema
			: constructorExtends(other.prototype, this.prototype)
			? // this cast is safe since we know other's constructor extends this one
			  (other.schema as schema)
			: Disjoint.from("prototype", this, other)
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
