import type { extend, Hkt } from "@arktype/util"
import { DynamicBase, reify } from "@arktype/util"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type { PropInput } from "./constraints/prop.js"
import type {
	TypeClassesByKind,
	TypeInputsByKind,
	TypeNodesByKind,
	validateBranchInput
} from "./types/type.js"

export interface BaseChildren {
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
] as const satisfies readonly PropInput[]

export const schema = <const branches extends readonly unknown[]>(
	...branches: {
		[i in keyof branches]: validateBranchInput<branches[i]>
	}
) => branches

export abstract class BaseNode<
	children extends BaseChildren = BaseChildren
> extends DynamicBase<children> {
	abstract kind: NodeKind

	declare condition: string

	description: string
	alias: string

	protected constructor(public children: children) {
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

export type nodeParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const nodeParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as nodeParser<node>

export type parseConstraint<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type NodeInputsByKind = extend<TypeInputsByKind, ConstraintInputsByKind>

export type inputOf<kind extends NodeKind> = NodeInputsByKind[kind]

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	TypeClassesByKind
>

export type NodesByKind = extend<ConstraintsByKind, TypeNodesByKind>

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]
