import type { extend } from "@arktype/util"
import type {
	AttributeRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { ConstraintDefinitionsByKind } from "./constraints/constraint.js"
import type { Disjoint } from "./disjoint.js"
import type { TypeNodeDefinitionsByKind } from "./types/type.js"

export type disjointIfAllowed<config extends { disjoinable: boolean }> =
	config["disjoinable"] extends true ? Disjoint : never

export type DefinitionsByKind = extend<
	TypeNodeDefinitionsByKind,
	ConstraintDefinitionsByKind
>

export interface NodeDefinition {
	kind: string
	rule: unknown
	attributes: extend<AttributeRecord, UniversalAttributes>
	class: typeof BaseNode
}

export type NodeKind = keyof DefinitionsByKind

export abstract class BaseNode<def extends NodeDefinition = NodeDefinition> {
	constructor(
		public rule: def["rule"],
		public attributes?: def["attributes"]
	) {}

	abstract readonly kind: def["kind"]
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract writeDefaultDescription(): string

	hasKind<kind extends NodeKind>(
		kind: kind
	): this is InstanceType<DefinitionsByKind[kind]["class"]> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		if (this.hasKind("divisor")) {
			const z = this.rule
		}
		return this.id === other.id
	}

	toString() {
		return this.attributes?.description ?? this.writeDefaultDescription()
	}
}
