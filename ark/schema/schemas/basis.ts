import type {
	Constructor,
	Key,
	NonEnumerableDomain,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { SchemaNode } from "../base.js"
import type { NodeDef } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BasisKind } from "../shared/implement.js"
import type { TraverseApply } from "../shared/traversal.js"
import type { DomainDef } from "./domain.js"
import type { ProtoDef } from "./proto.js"
import { BaseType, type BaseTypeDeclaration } from "./schema.js"
import type { UnitDef } from "./unit.js"

export interface BaseBasisDeclaration extends BaseTypeDeclaration {
	kind: BasisKind
}

export abstract class BaseBasis<
	t,
	$,
	d extends BaseBasisDeclaration
> extends BaseType<t, $, d> {
	abstract readonly expression: string
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]
	abstract literalKeys: Key[]

	rawKeyOf(): SchemaNode {
		return this.$.units(this.literalKeys)
	}

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.errorContext as never)
		}
	}

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}
}

export type inferBasis<def extends NodeDef<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<def> extends true
		? any
		: def extends NonEnumerableDomain
		? inferDomain<def>
		: def extends Constructor<infer instance>
		? instance
		: def extends DomainDef<infer domain>
		? inferDomain<domain>
		: def extends ProtoDef<infer proto>
		? instanceOf<proto>
		: def extends UnitDef<infer is>
		? is
		: never
