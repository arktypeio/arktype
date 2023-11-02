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
import { BaseRoot } from "../root.js"
import type { BaseBasis } from "./basis.js"

export type ProtoSchema<
	proto extends AbstractableConstructor = AbstractableConstructor
> = proto | ProtoInner

export type ProtoInner<
	proto extends AbstractableConstructor = AbstractableConstructor
> = withAttributes<{
	readonly proto: proto
}>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
}>

export class ProtoNode<t extends object = object>
	extends BaseRoot<ProtoDeclaration, t>
	implements BaseBasis
{
	static readonly kind = "proto"
	static readonly declaration: ProtoDeclaration

	static readonly definition = this.define({
		kind: "proto",
		keys: {
			proto: "in"
		},
		intersections: {
			proto: (l, r) =>
				constructorExtends(l.proto, r.proto)
					? l
					: constructorExtends(r.proto, l.proto)
					? r
					: Disjoint.from("proto", l, r),
			domain: (l, r): ProtoInner | Disjoint =>
				r.domain === "object"
					? l
					: Disjoint.from("domain", builtins().object, r)
		},
		parseSchema: (schema) =>
			typeof schema === "function" ? { proto: schema } : schema,
		compileCondition: (inner) =>
			`${this.argName} instanceof ${
				objectKindOf(inner.proto) ?? compileSerializedValue(inner.proto)
			}`,
		writeDefaultDescription: (inner) => {
			const knownObjectKind = getExactBuiltinConstructorName(inner.proto)
			return knownObjectKind
				? objectKindDescriptions[knownObjectKind]
				: `an instance of ${inner.proto.name}`
		}
	})

	readonly knownObjectKind = objectKindOf(this.proto)
	readonly basisName = `${this.proto.name}`
	readonly domain = "object"

	// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

	extendsOneOf<constructors extends readonly AbstractableConstructor[]>(
		...constructors: constructors
	) {
		return constructors.some((constructor) =>
			constructorExtends(this.proto, constructor)
		)
	}
}
