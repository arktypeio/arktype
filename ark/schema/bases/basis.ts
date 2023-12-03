import {
	printable,
	throwParseError,
	type Constructor,
	type Domain,
	type extend,
	type inferDomain,
	type instanceOf,
	type isAny
} from "@arktype/util"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import type { Schema } from "../shared/nodes.js"
import { isNode } from "../shared/symbols.js"
import {
	DomainImplementation,
	type DomainDeclaration,
	type DomainNode,
	type DomainSchema,
	type NonEnumerableDomain
} from "./domain.js"
import {
	ProtoImplementation,
	type ProtoDeclaration,
	type ProtoNode,
	type ProtoSchema
} from "./proto.js"
import { UnitNode, type UnitDeclaration, type UnitSchema } from "./unit.js"

export type BasisDeclarations = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export const BasisImplementations = {
	domain: DomainImplementation,
	proto: ProtoImplementation,
	unit: UnitNode
}

export type BasisKind = keyof BasisDeclarations

export type BasisAttachments = extend<
	PrimitiveConstraintAttachments,
	{
		readonly domain: Domain
		readonly basisName: string
	}
>

export const maybeGetBasisKind = (schema: unknown): BasisKind | undefined => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return "proto"
		case "object":
			if (schema === null) {
				return
			}
			if (isNode(schema)) {
				if (schema.isBasis()) {
					return schema.kind
				}
			}
			if ("domain" in schema) {
				return "domain"
			} else if ("proto" in schema) {
				return "proto"
			} else if ("unit" in schema) {
				return "unit"
			}
	}
}

export type instantiateBasis<def extends Schema<BasisKind>> =
	//allow any to be used to access all refinements
	isAny<def> extends true
		? any
		: def extends NonEnumerableDomain
		  ? DomainNode<inferDomain<def>>
		  : def extends Constructor<infer instance>
		    ? ProtoNode<instance>
		    : def extends DomainSchema<infer domain>
		      ? DomainNode<inferDomain<domain>>
		      : def extends ProtoSchema<infer proto>
		        ? ProtoNode<instanceOf<proto>>
		        : def extends UnitSchema<infer is>
		          ? UnitNode<is>
		          : never

export const assertBasisKind = (schema: unknown) => {
	const basisKind = maybeGetBasisKind(schema)
	if (basisKind === undefined) {
		return throwParseError(
			`${printable(
				schema
			)} is not a valid basis schema. Please provide one of the following:
- A string representing a non-enumerable domain ("string", "number", "object", "bigint", or "symbol")
- A constructor like Array
- A schema object with one of the following keys:
	- "domain"
	- "proto"
	- "unit"`
		)
	}
	return basisKind
}
