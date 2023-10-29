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

export type parseBasis<input extends Schema<BasisKind>> =
	input extends DomainSchema<infer domain>
		? DomainNode<domain>
		: input extends ProtoSchema<infer proto>
		? ProtoNode<proto>
		: input extends UnitSchema<infer unit>
		? UnitNode<unit>
		: never
