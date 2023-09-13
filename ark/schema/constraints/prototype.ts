import type { AbstractableConstructor, conform } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	Hkt,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseSchema } from "../schema.js"
import { parser } from "../schema.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface PrototypeSchema<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends BaseSchema {
	rule: constructor
}

export type PrototypeInput = AbstractableConstructor | PrototypeSchema

export class PrototypeNode<
	schema extends PrototypeSchema = PrototypeSchema
> extends ConstraintNode<schema> {
	readonly kind = "prototype"

	declare infer: InstanceType<schema["rule"]>

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], PrototypeInput>) => {
			return new PrototypeNode(
				typeof input === "function" ? { rule: input } : input
			) as {} as typeof input extends PrototypeSchema
				? PrototypeNode<typeof input>
				: typeof input extends AbstractableConstructor
				? { rule: typeof input }
				: never
		}
	})()

	static from = parser(this)

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
	): this is PrototypeNode<{ rule: constructors[number] }> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}

	reduceWith(other: Constraint) {
		return other.kind !== "prototype"
			? null
			: constructorExtends(this.rule, other.rule)
			? this.schema
			: constructorExtends(other.rule, this.rule)
			? // this cast is safe since we know other's constructor extends this one
			  (other.schema as schema)
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
