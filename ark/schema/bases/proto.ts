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

export class ProtoNode
	extends RootNode<ProtoDeclaration, object>
	implements BaseBasis
{
	static readonly kind = "proto"

	static {
		this.classesByKind.proto = this
	}

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
						builtins().object as DomainNode,
						r
				  )
	})

	static readonly compile = this.defineCompiler(
		(inner) =>
			`${this.argName} instanceof ${
				objectKindOf(inner.proto) ?? compileSerializedValue(inner.proto)
			}`
	)

	static parse(schema: ProtoSchema) {
		return new ProtoNode(
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
	) {
		return constructors.some((constructor) =>
			constructorExtends(this.proto, constructor)
		)
	}
}
