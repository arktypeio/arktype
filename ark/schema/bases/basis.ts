import {
	domainOf,
	type inferDomain,
	type instanceOf,
	type isAny,
	stringify,
	throwParseError
} from "@arktype/util"
import { type Schema } from "../nodes.js"
import type { DomainDeclaration, DomainSchema } from "./domain.js"
import { DomainNode } from "./domain.js"
import type { ProtoDeclaration, ProtoSchema } from "./proto.js"
import { ProtoNode } from "./proto.js"
import type { UnitDeclaration, UnitSchema } from "./unit.js"
import { UnitNode } from "./unit.js"

export const basisClassesByKind = {
	domain: DomainNode,
	proto: ProtoNode,
	unit: UnitNode
}

export type BasisDeclarationsByKind = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export type BasisKind = keyof BasisDeclarationsByKind

export type BaseBasis = {
	readonly basisName: string
}

export type parseBasis<schema extends Schema<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<schema> extends true
		? any
		: schema extends DomainSchema<infer domain>
		? inferDomain<domain>
		: schema extends ProtoSchema<infer proto>
		? instanceOf<proto>
		: schema extends UnitSchema<infer unit>
		? unit
		: never

export const maybeParseBasis = (schema: Schema<"intersection">) => {
	switch (typeof schema) {
		case "string":
			return DomainNode.parse(schema)
		case "function":
			return ProtoNode.parse(schema)
		case "object":
			return "unit" in schema
				? UnitNode.parse(schema)
				: "proto" in schema
				? ProtoNode.parse(schema)
				: "domain" in schema
				? DomainNode.parse(schema)
				: undefined
	}
}

export const parseBasis = (schema: Schema<BasisKind>) =>
	maybeParseBasis(schema) ??
	throwParseError(
		`Basis schema must be a non-enumerable domain, a constructor, or have one of the following keys:
is", "unit", "proto", "domain"`
	)
