import {
	stringify,
	throwParseError,
	type Constructor,
	type Domain,
	type extend,
	type inferDomain,
	type instanceOf,
	type isAny
} from "@arktype/util"
import { isNode } from "../io/registry.js"
import type { Node, Schema } from "../shared/node.js"
import type { RuleAttachments } from "../shared/rule.js"
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

export type BasisAttachments = extend<
	RuleAttachments,
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
			} else if ("is" in schema) {
				return "unit"
			}
	}
}

export type parseBasis<schema extends Schema<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<schema> extends true
		? any
		: schema extends NonEnumerableDomain
		  ? Node<"domain", inferDomain<schema>>
		  : schema extends Constructor<infer instance>
		    ? Node<"proto", instance>
		    : schema extends DomainSchema<infer domain>
		      ? Node<"domain", inferDomain<domain>>
		      : schema extends ProtoSchema<infer proto>
		        ? Node<"proto", instanceOf<proto>>
		        : schema extends UnitSchema<infer is>
		          ? Node<"unit", is>
		          : never

export const getBasisKindOrThrow = (schema: unknown) => {
	const basisKind = maybeGetBasisKind(schema)
	if (basisKind === undefined) {
		return throwParseError(
			`${stringify(
				schema
			)} is not a valid basis schema. Please provide one of the following:
- A string representing a non-enumerable domain ("string", "number", "object", "bigint", or "symbol")
- A constructor like Array
- A schema object with one of the following keys:
	- "domain"
	- "proto"
	- "is"`
		)
	}
	return basisKind
}
