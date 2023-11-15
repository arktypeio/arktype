import {
	type Constructor,
	type Domain,
	type extend,
	type inferDomain,
	type instanceOf,
	type isAny
} from "@arktype/util"
import type { Node, type RuleAttachments, Schema } from "../node.ts"
import {
	type DomainDeclaration,
	DomainImplementation,
	type DomainSchema,
	type NonEnumerableDomain
} from "./domain.ts"
import {
	type ProtoDeclaration,
	ProtoImplementation,
	type ProtoSchema
} from "./proto.ts"
import {
	type UnitDeclaration,
	UnitImplementation,
	type UnitSchema
} from "./unit.ts"

export type BasisDeclarationsByKind = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export const BasisImplementationByKind = {
	domain: DomainImplementation,
	proto: ProtoImplementation,
	unit: UnitImplementation
}

export type BasisKind = keyof BasisDeclarationsByKind

export const basisKinds = [
	"unit",
	"proto",
	"domain"
] as const satisfies readonly BasisKind[]

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
