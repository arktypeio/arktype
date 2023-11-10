import {
	type inferDomain,
	type instanceOf,
	type isAny,
	throwParseError
} from "@arktype/util"
import { type BaseNode } from "../base.js"
import { type Node, type Schema } from "../nodes.js"
import type {
	DomainDeclaration,
	DomainImplementation,
	DomainSchema
} from "./domain.js"
import type {
	ProtoDeclaration,
	ProtoImplementation,
	ProtoSchema
} from "./proto.js"
import type { UnitDeclaration, UnitImplementation, UnitSchema } from "./unit.js"

export type BasisDeclarationsByKind = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export type BasisClassesByKind = {
	domain: typeof DomainImplementation
	proto: typeof ProtoImplementation
	unit: typeof UnitImplementation
}

export type BasisKind = keyof BasisDeclarationsByKind

export type BaseBasis = {
	readonly basisName: string
	readonly implicitBasis: Node<BasisKind>
}

export type parseBasis<schema extends Schema<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<schema> extends true
		? any
		: schema extends DomainSchema<infer domain>
		? Node<"domain", inferDomain<domain>>
		: schema extends ProtoSchema<infer proto>
		? Node<"proto", instanceOf<proto>>
		: schema extends UnitSchema<infer unit>
		? Node<"unit", unit>
		: never

export const maybeParseBasis = (
	schema: Schema<"intersection" | BasisKind>
): Node<BasisKind> | undefined => {
	return undefined
	// switch (typeof schema) {
	// 	case "string":
	// 		return new DomainNode(schema)
	// 	case "function":
	// 		return new ProtoNode(schema)
	// 	case "object":
	// 		return "unit" in schema
	// 			? new UnitNode(schema)
	// 			: "proto" in schema
	// 			? new ProtoNode(schema)
	// 			: "domain" in schema
	// 			? new DomainNode(schema)
	// 			: undefined
	// }
}

export const parseBasis = (schema: Schema<BasisKind>) =>
	maybeParseBasis(schema) ??
	throwParseError(
		`Basis schema must be a non-enumerable domain, a constructor, or have one of the following keys:
"is", "unit", "proto", "domain"`
	)
