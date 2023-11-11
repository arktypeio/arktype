import {
	type AbstractableConstructor,
	type Domain,
	type extend,
	type inferDomain,
	type instanceOf,
	type isAny,
	throwParseError
} from "@arktype/util"
import {
	type BaseNode,
	type BaseNodeDeclaration,
	defineNode,
	type NodeImplementation,
	type RuleAttachments
} from "../base.ts"
import {
	type Node,
	type NodeDeclarationsByKind,
	type Schema
} from "../nodes.ts"
import type {
	DomainDeclaration,
	DomainImplementation,
	DomainSchema
} from "./domain.ts"
import type {
	ProtoDeclaration,
	ProtoImplementation,
	ProtoSchema
} from "./proto.ts"
import type { UnitDeclaration, UnitImplementation, UnitSchema } from "./unit.ts"

export type BasisDeclarationsByKind = {
	domain: DomainDeclaration
	proto: ProtoDeclaration
	unit: UnitDeclaration
}

export type BasisImplementationByKind = {
	domain: typeof DomainImplementation
	proto: typeof ProtoImplementation
	unit: typeof UnitImplementation
}

export type BasisKind = keyof BasisDeclarationsByKind

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
		: schema extends DomainSchema<infer domain>
		? Node<"domain", inferDomain<domain>>
		: schema extends ProtoSchema<infer proto>
		? Node<"proto", instanceOf<proto>>
		: schema extends UnitSchema<infer unit>
		? Node<"unit", unit>
		: never
