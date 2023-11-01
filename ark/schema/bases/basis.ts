import {
	domainOf,
	type inferDomain,
	type instanceOf,
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
	schema extends DomainSchema<infer domain>
		? inferDomain<domain>
		: schema extends ProtoSchema<infer proto>
		? instanceOf<proto>
		: schema extends UnitSchema<infer unit>
		? unit
		: never

export const maybeParseCollapsedBasis = (schema: Schema<"intersection">) => {
	switch (typeof schema) {
		case "string":
			return DomainNode.parse(schema)
		case "function":
			return ProtoNode.parse(schema)
		case "object":
			return "is" in schema ? UnitNode.parse(schema) : undefined
	}
}

export const parseBasis = (schema: Schema<BasisKind>) => {
	const collapsedResult = maybeParseCollapsedBasis(schema)
	if (collapsedResult) {
		return collapsedResult
	}
	if (typeof schema !== "object") {
		return throwParseError(`${domainOf(schema)} is not a valid basis schema`)
	}
	if ("unit" in schema) {
		return UnitNode.parse(schema)
	}
	if ("proto" in schema) {
		return ProtoNode.parse(schema)
	}
	if ("domain" in schema) {
		return DomainNode.parse(schema)
	}
	return throwParseError(
		`Basis schema must be a non-enumerable domain, a constructor, or have one of the following keys:
is", "unit", "proto", "domain"`
	)
}
