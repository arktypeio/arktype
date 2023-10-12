import type { extend } from "@arktype/util"
import { DynamicBase } from "@arktype/util"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type { PropSchema } from "./constraints/prop.js"
import type {
	TypeClassesByKind,
	TypeInputsByKind,
	TypeNodesByKind,
	validateBranchInput
} from "./types/type.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

export const baseChildrenProps = [
	{
		key: "alias",
		value: "string",
		optional: true
	},
	{
		key: "description",
		value: "string",
		optional: true
	}
] as const satisfies readonly PropSchema[]

export const schema = <const branches extends readonly unknown[]>(
	...branches: {
		[i in keyof branches]: validateBranchInput<branches[i]>
	}
) => branches

const prevalidated = Symbol("used to bypass validation when creating a node")

export type Prevalidated = typeof prevalidated

export abstract class BaseNode<
	children extends BaseAttributes = BaseAttributes
> extends DynamicBase<children> {
	abstract kind: NodeKind

	declare condition: string

	description: string
	alias: string

	protected static readonly prevalidated = prevalidated

	constructor(public children: children) {
		super(children)
		this.description = children.description ?? this.writeDefaultDescription()
		this.alias = children.alias ?? "generated"
	}

	abstract inId: string
	abstract outId: string
	abstract typeId: string
	metaId = this.writeMetaId()

	private writeMetaId() {
		return JSON.stringify({
			type: this.typeId,
			description: this.description,
			alias: this.alias
		})
	}

	abstract writeDefaultDescription(): string

	equals(other: BaseNode) {
		return this.typeId === other.typeId
	}

	allows(data: unknown) {
		return true
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}
}

export type inputOf<kind extends NodeKind> = NodeInputsByKind[kind]

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

export type NodesByKind = extend<ConstraintsByKind, TypeNodesByKind>

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]
