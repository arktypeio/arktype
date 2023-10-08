import type { extend, Hkt } from "@arktype/util"
import { DynamicBase, hasKey, reify, throwParseError } from "@arktype/util"
import type { BasisClassesByKind } from "./constraints/basis.js"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type {
	TypeClassesByKind,
	TypeInputsByKind,
	TypeNodesByKind
} from "./types/type.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

const baseAttributeKeys = {
	alias: 1,
	description: 1
} as const satisfies { [k in keyof BaseAttributes]-?: 1 }

export const allowKeys = <schema extends BaseAttributes>(keys: {
	[k in Exclude<keyof schema, keyof BaseAttributes>]-?: 1
}) => ({ ...baseAttributeKeys, ...keys })

export const allowsKeys = <kind extends NodeKind>(
	kind: kind,
	allowedKeys: BasisClassesByKind[kind]["allowedKeys"],
	input: object
) => {
	const unknownKeys = Object.keys(input).filter((k) => !hasKey(allowedKeys, k))
	if (unknownKeys.length) {
		throwParseError(
			`Keys ${unknownKeys.join(
				", "
			)} are not allowed on schema of kind '${kind}'`
		)
	}
}

export abstract class BaseNode<
	schema extends BaseAttributes = BaseAttributes
> extends DynamicBase<schema> {
	abstract kind: NodeKind

	declare condition: string

	description: string
	alias: string

	protected constructor(public schema: schema) {
		super(schema)
		this.description ??= this.writeDefaultDescription()
		this.alias ??= "generated"
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
