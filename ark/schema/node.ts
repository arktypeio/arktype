import type { extend } from "@arktype/util"
import type { AttributeRecord } from "./attributes/attribute.js"
import type { ConstraintsByKind } from "./constraints/constraint.js"
import type { Disjoint } from "./disjoint.js"
import type { TypesByKind } from "./types/type.js"

export type disjointIfAllowed<config extends { disjoinable: boolean }> =
	config["disjoinable"] extends true ? Disjoint : never

export type NodesByKind = extend<TypesByKind, ConstraintsByKind>

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class BaseNode<
	rule = unknown,
	attributes extends AttributeRecord = AttributeRecord
> {
	protected constructor(
		public rule: rule,
		public attributes = {} as attributes
	) {}

	abstract readonly kind: NodeKind
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract writeDefaultDescription(): string

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}

	toString() {
		return this.attributes?.description ?? this.writeDefaultDescription()
	}
}
