import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

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
	>
	extends BaseNode<ProtoChildren, typeof ProtoNode>
	implements BaseBasis
{
	static readonly kind = "proto"

	declare infer: InstanceType<rule>

	// id
	// this.knownObjectKind ?? compileSerializedValue(this.rule)

	knownObjectKind = objectKindOf(this.rule)
	basisName = `${this.rule.name}`

	static keyKinds = this.declareKeys({
		rule: "in"
	})

	static intersections = this.defineIntersections({
		proto: (l, r) =>
			constructorExtends(l.rule, r.rule)
				? l
				: constructorExtends(r.rule, l.rule)
				? r
				: Disjoint.from("proto", l, r)
	})

	static from<rule extends AbstractableConstructor>(schema: ProtoSchema<rule>) {
		return new ProtoNode<rule>(
			typeof schema === "function" ? { rule: schema } : schema
		)
	}

	static writeDefaultDescription(children: ProtoChildren) {
		const knownObjectKind = getExactBuiltinConstructorName(children.rule)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${children.rule.name}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.rule, constructor)
		)
	}
}

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// compile() {
// 	return `${In} instanceof ${
// 		getExactBuiltinConstructorName(this.rule) ??
// 		registry().register(this.rule)
// 	}`
// }
