import type { conform } from "@arktype/util"
import { Hkt } from "@arktype/util"
import { compileSerializedValue } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import type { BaseAttributes } from "../type.js"
import { nodeParser } from "../type.js"
import type { Basis } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement } from "./refinement.js"

export interface NarrowSchema extends BaseAttributes {
	predicate: Predicate
}

export type NarrowInput = Predicate | NarrowSchema

export class NarrowNode
	extends BaseConstraint<NarrowSchema>
	implements BaseRefinement
{
	readonly kind = "narrow"

	protected constructor(schema: NarrowSchema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], NarrowInput>) => {
			return new NarrowNode(
				typeof input === "function" ? { predicate: input } : input
			)
		}
	})()

	static from = nodeParser(this)

	applicableTo(
		basis: Basis | undefined
	): basis is DomainNode | ProtoNode | undefined {
		return (
			basis === undefined || basis.kind === "domain" || basis.kind === "proto"
		)
	}

	hash() {
		return compileSerializedValue(this.predicate)
	}

	writeDefaultDescription() {
		return `valid according to ${this.predicate.name}`
	}

	intersectSymmetric() {
		return null
	}

	intersectAsymmetric() {
		return null
	}
}

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.

export type Predicate<data = any> = (
	data: data,
	traversal: TraversalState
) => boolean

export type PredicateCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
