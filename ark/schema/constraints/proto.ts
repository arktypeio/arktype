import type { AbstractableConstructor } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf
} from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { RootNode } from "../root.js"
import type { BaseBasis } from "./basis.js"
import { type DomainNode } from "./domain.js"

export type ProtoSchema<
	proto extends AbstractableConstructor = AbstractableConstructor
> = proto | ProtoInner

export type ProtoInner<
	proto extends AbstractableConstructor = AbstractableConstructor
> = withAttributes<{
	readonly proto: proto
}>

export type ProtoDeclaration = declareNode<
	"proto",
	{
		schema: ProtoSchema
		inner: ProtoInner
		intersections: {
			proto: "proto" | Disjoint
			domain: "proto" | Disjoint
		}
	},
	typeof ProtoNode
>

export class ProtoNode<
		proto extends AbstractableConstructor = AbstractableConstructor
	>
	extends RootNode<ProtoDeclaration>
	implements BaseBasis
{
	static readonly kind = "proto"

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
		domain: (l, r): ProtoInner | Disjoint =>
			r.domain === "object"
				? l
				: Disjoint.from(
						"domain",
						// TODO: cast needed?
						builtins.object() as {} as DomainNode<"object">,
						r
				  )
	})

	static readonly compile = this.defineCompiler(
		(inner) =>
			`${this.argName} instanceof ${
				objectKindOf(inner.proto) ?? compileSerializedValue(inner.proto)
			}`
	)

	static from<rule extends AbstractableConstructor>(schema: ProtoSchema<rule>) {
		return new ProtoNode<rule>(
			typeof schema === "function" ? { proto: schema } : schema
		)
	}

	static writeDefaultDescription(inner: ProtoInner) {
		const knownObjectKind = getExactBuiltinConstructorName(inner.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${inner.proto.name}`
	}

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	): this is ProtoNode<constructors[number]> {
		return constructors.some((constructor) =>
			constructorExtends(this.proto, constructor)
		)
	}
}
