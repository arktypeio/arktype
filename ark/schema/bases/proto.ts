import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions,
	objectKindOf,
	type Constructor
} from "@arktype/util"
import {
	In,
	compilePrimitive,
	compileSerializedValue,
	type CompilationContext
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import {
	defaultValueSerializer,
	type NodeParserImplementation
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { BaseType } from "../type.js"

export type ProtoInner<proto extends Constructor = Constructor> = {
	readonly proto: proto
}

export type NormalizedProtoSchema<proto extends Constructor = Constructor> =
	withAttributes<ProtoInner<proto>>

export type ProtoSchema<proto extends Constructor = Constructor> =
	| proto
	| NormalizedProtoSchema<proto>

export type ProtoDeclaration = declareNode<{
	kind: "proto"
	schema: ProtoSchema
	normalizedSchema: NormalizedProtoSchema
	inner: ProtoInner
	intersections: {
		proto: "proto" | Disjoint
		domain: "proto" | Disjoint
	}
}>

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

export class ProtoNode<t = unknown> extends BaseType<t, ProtoDeclaration> {
	static parser: NodeParserImplementation<ProtoDeclaration> = {
		collapseKey: "proto",
		keys: {
			proto: {
				serialize: (constructor) =>
					getExactBuiltinConstructorName(constructor) ??
					defaultValueSerializer(constructor)
			}
		},
		normalize: (input) =>
			typeof input === "function" ? { proto: input } : input
	}

	static intersections: NodeIntersections<ProtoDeclaration> = {
		proto: (l, r) =>
			constructorExtends(l.proto, r.proto)
				? l
				: constructorExtends(r.proto, l.proto)
				  ? r
				  : Disjoint.from("proto", l, r),
		domain: (l, r) =>
			r.domain === "object"
				? l
				: Disjoint.from("domain", l.scope.builtin.object, r)
	}

	readonly basisName = `${this.proto.name}`
	readonly serializedConstructor = (this.json as { proto: string }).proto
	readonly domain = "object"
	readonly condition = `${In} instanceof ${this.serializedConstructor}`
	readonly negatedCondition = `!(${this.condition})`
	traverseAllows = (data: unknown) => data instanceof this.proto
	traverseApply = this.createPrimitiveTraversal()

	compileBody(ctx: CompilationContext): string {
		return compilePrimitive(this, ctx)
	}

	writeDefaultDescription() {
		const knownObjectKind = getExactBuiltinConstructorName(this.proto)
		return knownObjectKind
			? objectKindDescriptions[knownObjectKind]
			: `an instance of ${this.proto.name}`
	}
}
