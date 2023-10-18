import type { extend } from "@arktype/util"
import { DynamicBase } from "@arktype/util"
import type { ConstraintClassesByKind } from "./constraints/constraint.js"
import type { TypeClassesByKind, validateBranchInput } from "./types/type.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

const baseAttributeKeys = {
	alias: 1,
	description: 1
} as const satisfies Record<keyof BaseAttributes, 1>

export const isBaseAttributeKey = (k: string): k is keyof BaseAttributes =>
	k in baseAttributeKeys

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

export abstract class BaseNode<
	children extends BaseAttributes = BaseAttributes
> extends DynamicBase<children> {
	abstract kind: NodeKind

	declare condition: string

	alias: string
	description: string

	protected static readonly prevalidated = prevalidated

	constructor(
		public children: children,
		public ids: NodeIds
	) {
		super(children)
		this.alias = children.alias ?? "generated"
		this.description =
			children.description ??
			(this.constructor as NodeClass).writeDefaultDescription(children as never)
	}

	equals(other: BaseNode) {
		return this.ids.type === other.ids.type
	}

	allows(data: unknown) {
		return true
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}

	toString() {
		return this.description
	}
}

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	TypeClassesByKind
>

export type NodeKind = keyof NodeClassesByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeClassesByKind[kind]

export type Schema<kind extends NodeKind> = Parameters<
	NodeClass<kind>["from"]
>[0]

export type Children<kind extends NodeKind> = ConstructorParameters<
	NodeClass<kind>
>[0]

export type Node<kind extends NodeKind = NodeKind> = InstanceType<
	NodeClass<kind>
>
