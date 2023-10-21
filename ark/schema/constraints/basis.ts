import type { Schema } from "../node.js"
import type { DomainSchema } from "./domain.js"
import { DomainNode } from "./domain.js"
import type { ProtoSchema } from "./proto.js"
import { ProtoNode } from "./proto.js"
import type { UnitSchema } from "./unit.js"
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

export type parseBasis<input extends Schema<BasisKind>> =
	input extends DomainSchema<infer domain>
		? DomainNode<domain>
		: input extends ProtoSchema<infer proto>
		? ProtoNode<proto>
		: input extends UnitSchema<infer unit>
		? UnitNode<unit>
		: never
