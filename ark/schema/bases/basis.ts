import type {
	Constructor,
	Domain,
	extend,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { Node, Schema } from "../shared/node.ts"
import type { RuleAttachments } from "../shared/rule.ts"
import {
	DomainImplementation,
	type DomainDeclaration,
	type DomainSchema,
	type NonEnumerableDomain
} from "./domain.ts"
import {
	ProtoImplementation,
	type ProtoDeclaration,
	type ProtoSchema
} from "./proto.ts"
import {
	UnitImplementation,
	type UnitDeclaration,
	type UnitSchema
} from "./unit.ts"

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
