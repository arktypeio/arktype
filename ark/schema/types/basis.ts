import type {
	Constructor,
	NonEnumerableDomain,
	evaluate,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { NodeSubclass } from "../base.js"
import type { Schema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseApply } from "../shared/context.js"
import type { BasisKind } from "../shared/implement.js"
import type { DomainNode, DomainSchema } from "./domain.js"
import type { ProtoNode, ProtoSchema } from "./proto.js"
import { BaseType, type BaseTypeDeclaration } from "./type.js"
import type { UnitNode, UnitSchema } from "./unit.js"

export type BaseBasisDeclaration = evaluate<
	BaseTypeDeclaration & { kind: BasisKind }
>

export abstract class BaseBasis<
	t,
	d extends BaseBasisDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseType<t, d, subclass> {
	abstract readonly expression: string
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]

	get hasOpenIntersection() {
		return false as const
	}

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler) {
		js.compilePrimitive(this as never)
	}
}

export type instantiateBasis<def extends Schema<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<def> extends true
		? any
		: def extends NonEnumerableDomain
		? DomainNode<inferDomain<def>>
		: def extends Constructor<infer instance>
		? ProtoNode<instance>
		: def extends DomainSchema<infer domain>
		? DomainNode<inferDomain<domain>>
		: def extends ProtoSchema<infer proto>
		? ProtoNode<instanceOf<proto>>
		: def extends UnitSchema<infer is>
		? UnitNode<is>
		: never
