import type { extend } from "@arktype/util"
import type {
	AttributeRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { ConstraintDefinitionsByKind } from "./constraints/constraint.js"
import type { Disjoint } from "./disjoint.js"
import type { RootDefinitionsByKind } from "./roots/root.js"

export type disjointIfAllowed<config extends { disjoinable: boolean }> =
	config["disjoinable"] extends true ? Disjoint : never

export type DefinitionsByKind = extend<
	RootDefinitionsByKind,
	ConstraintDefinitionsByKind
>

export type NodeDefinition = {
	kind: string
	rule: unknown
	node: BaseNode
	attributes: extend<AttributeRecord, UniversalAttributes>
}

export type NodeKind = keyof DefinitionsByKind

export abstract class BaseNode<def extends NodeDefinition = NodeDefinition> {
	protected constructor(
		public rule: def["rule"],
		public attributes: def["attributes"]
	) {}

	abstract readonly kind: def["kind"]
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract writeDefaultDescription(): string

	hasKind<kind extends NodeKind>(
		kind: kind
	): this is DefinitionsByKind[kind]["node"] {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}

	toString() {
		return this.attributes.description ?? this.writeDefaultDescription()
	}
}
