import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

export interface ProtoChildren<
	rule extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	readonly proto: rule
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

	knownObjectKind = objectKindOf(this.proto)
	basisName = `${this.proto.name}`

	static keyKinds = this.declareKeys({
		proto: "in"
	})

	static intersections = this.defineIntersections({
		proto: (l, r) =>
			constructorExtends(l.proto, r.proto)
				? l
				: constructorExtends(r.proto, l.proto)
				? r
				: Disjoint.from("proto", l, r),
		domain: (l, r): ProtoChildren | Disjoint =>
			r.domain === "object"
				? l
				: Disjoint.from("domain", builtins.object().unwrapOnly("domain")!, r)
	})

	static from<rule extends AbstractableConstructor>(schema: ProtoSchema<rule>) {
		return new ProtoNode<rule>(
			typeof schema === "function" ? { proto: schema } : schema
		)
	}

	static writeDefaultDescription(children: ProtoChildren) {
		const knownObjectKind = getExactBuiltinConstructorName(children.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${children.proto.name}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.proto, constructor)
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
