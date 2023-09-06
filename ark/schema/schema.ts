import type { extend } from "@arktype/util"
import { DynamicBase } from "@arktype/util"
import type {
	BasesByKind,
	ConstraintsByKind,
	NodeSubclass,
	RefinementsByKind
} from "./constraints/constraint.js"
import type { RootsByKind } from "./main.js"

export interface BaseSchema {
	description?: string
}

// @ts-expect-error
export abstract class BaseNode<
	schema extends BaseSchema = BaseSchema,
	node extends NodeSubclass<node> = NodeSubclass<any>
> extends DynamicBase<schema> {
	abstract kind: SchemaKind

	constructor(public schema: schema) {
		super(schema)
	}

	hasKind<kind extends SchemaKind>(kind: kind): this is Schema<kind> {
		return this.kind === kind
	}

	abstract writeDefaultDescription(): string
}

export type SchemasByKind = extend<ConstraintsByKind, RootsByKind>

export type SchemaKind = keyof SchemasByKind

export type Schema<kind extends SchemaKind = SchemaKind> = SchemasByKind[kind]
