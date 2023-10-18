import { DomainNode } from "./domain.js"
import { ProtoNode } from "./proto.js"
import { UnitNode } from "./unit.js"

export type BasisClassesByKind = typeof basisClassesByKind

export const basisClassesByKind = {
	domain: DomainNode,
	proto: ProtoNode,
	unit: UnitNode
}

export type BasisKind = keyof BasisClassesByKind

export interface BaseBasis {
	basisName: string
}
