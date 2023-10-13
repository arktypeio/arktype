import type { extend } from "@arktype/util"
import { DynamicBase } from "@arktype/util"
import type { ConstraintClassesByKind } from "./constraints/constraint.js"
import type { TypeClassesByKind, validateBranchInput } from "./types/type.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

export type NodeIds = {
	in: string
	out: string
	type: string
	reference: string
}

export const schema = <const branches extends readonly unknown[]>(
	...branches: {
		[i in keyof branches]: validateBranchInput<branches[i]>
	}
) => branches

const prevalidated = Symbol("used to bypass validation when creating a node")

export type Prevalidated = typeof prevalidated

export const createReferenceId = (
	referenceObject: Record<string, unknown>,
	schema: BaseAttributes
) => {
	if (schema.description) {
		referenceObject.description = schema.description
	}
	if (schema.alias) {
		referenceObject.alias = schema.alias
	}
	return JSON.stringify(referenceObject)
}

export abstract class BaseNode {
	abstract kind: NodeKind
	abstract schema: BaseAttributes

	declare condition: string

	description: string
	alias: string

	protected static readonly prevalidated = prevalidated

	constructor(
		schema: BaseAttributes,
		public ids: NodeIds
	) {
		this.description = schema.description ?? this.writeDefaultDescription()
		this.alias = schema.alias ?? "generated"
	}

	abstract writeDefaultDescription(): string

	equals(other: BaseNode) {
		return this.ids.type === other.ids.type
	}

	allows(data: unknown) {
		return true
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}
}

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	TypeClassesByKind
>

export type NodeKind = keyof NodeClassesByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeClassesByKind[kind]

export type Schema<kind extends NodeKind> = ConstructorParameters<
	NodeClass<kind>
>

export type Node<kind extends NodeKind = NodeKind> = InstanceType<
	NodeClass<kind>
>
