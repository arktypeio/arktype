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
import type { TypeNode } from "../type.js"
import {
	DomainImplementation,
	type DomainDeclaration,
	type DomainSchema,
	type NonEnumerableDomain
} from "./domain.js"
import {
	ProtoImplementation,
	type ProtoDeclaration,
	type ProtoSchema
} from "./proto.js"
import {
	UnitImplementation,
	type UnitDeclaration,
	type UnitSchema
} from "./unit.js"

export type BasisDeclarations = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export const BasisImplementations = {
	domain: DomainImplementation,
	proto: ProtoImplementation,
	unit: UnitImplementation
}

export type BasisKind = keyof BasisDeclarations

export type BasisAttachments<kind extends BasisKind> = extend<
	PrimitiveConstraintAttachments<kind>,
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
		  ? TypeNode<inferDomain<def>, "domain">
		  : def extends Constructor<infer instance>
		    ? TypeNode<instance, "proto">
		    : def extends DomainSchema<infer domain>
		      ? TypeNode<inferDomain<domain>, "domain">
		      : def extends ProtoSchema<infer proto>
		        ? TypeNode<instanceOf<proto>, "proto">
		        : def extends UnitSchema<infer is>
		          ? TypeNode<is, "unit">
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
