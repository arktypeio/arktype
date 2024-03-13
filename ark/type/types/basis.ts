import type {
	Constructor,
	NonEnumerableDomain,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { Schema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseApply } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { BasisKind } from "../shared/implement.js"
import type { DomainSchema } from "./domain.js"
import type { ProtoSchema } from "./proto.js"
import { BaseType } from "./type.js"
import type { UnitSchema } from "./unit.js"

export abstract class BaseBasis<
	t,
	d extends BaseNodeDeclaration,
	$
> extends BaseType<t, d, $> {
	abstract readonly expression: string
	abstract readonly compiledCondition: string
	abstract readonly compiledNegation: string
	abstract readonly errorContext: d["errorContext"]

	traverseApply: TraverseApply<d["prerequisite"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.error(this.description)
		}
	}

	compile(js: NodeCompiler): void {
		js.compilePrimitive(this as never)
	}
}

export type inferBasis<def extends Schema<BasisKind>> =
	//allow any to be used to access all constraints
	isAny<def> extends true
		? any
		: def extends NonEnumerableDomain
		? inferDomain<def>
		: def extends Constructor<infer instance>
		? instance
		: def extends DomainSchema<infer domain>
		? inferDomain<domain>
		: def extends ProtoSchema<infer proto>
		? instanceOf<proto>
		: def extends UnitSchema<infer is>
		? is
		: never
