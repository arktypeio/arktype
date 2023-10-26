import type { AbstractableConstructor, instanceOf } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

export interface ProtoChildren<
	proto extends AbstractableConstructor = AbstractableConstructor
> extends BaseAttributes {
	readonly proto: proto
}

export type ProtoSchema<
	proto extends AbstractableConstructor = AbstractableConstructor
> = proto | ProtoChildren

export class ProtoNode<
		proto extends AbstractableConstructor = AbstractableConstructor
	>
	extends BaseNode<ProtoChildren, typeof ProtoNode>
	implements BaseBasis
{
	static readonly kind = "proto"

	declare infer: instanceOf<proto>

	readonly knownObjectKind = objectKindOf(this.proto)
	readonly basisName = `${this.proto.name}`
	readonly domain = "object"

	static readonly keyKinds = this.declareKeys({
		proto: "in"
	})

	// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

	static readonly intersections = this.defineIntersections({
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

	static readonly compile = this.defineCompiler(
		(children) =>
			`${this.argName} instanceof ${
				objectKindOf(children.proto) ?? compileSerializedValue(children.proto)
			}`
	)

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
