import { BaseNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { DomainNode } from "../bases/domain.js"
import type { ProtoNode } from "../bases/proto.js"
import { builtins } from "../builtins.js"
import { compileSerializedValue } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import { type Node } from "../nodes.js"
import { type Root } from "../root.js"
import { type declareRefinement } from "./refinement.js"
import { getBasisName } from "./shared.js"

export type PredicateInner<rule extends Predicate = Predicate> =
	withAttributes<{
		readonly predicate: rule
	}>

export type PredicateSchema<rule extends Predicate = Predicate> =
	| rule
	| PredicateInner<rule>

export type PredicateDeclaration = declareRefinement<
	"predicate",
	{
		schema: PredicateSchema
		inner: PredicateInner
		intersections: {
			predicate: "predicate" | null
		}
	},
	typeof PredicateNode
>

export class PredicateNode extends BaseNode<PredicateDeclaration> {
	static readonly kind = "predicate"

	static {
		this.classesByKind.predicate = this
	}

	static readonly keyKinds = this.declareKeys({
		predicate: "in"
	})

	static basis: Root<unknown> = builtins().unknown

	static readonly compile = this.defineCompiler(
		(inner) => `${compileSerializedValue(inner.predicate)}(${this.argName})`
	)

	static readonly intersections = this.defineIntersections({
		predicate: () => null
	})

	static parse(schema: PredicateSchema) {
		return new PredicateNode(
			typeof schema === "function" ? { predicate: schema } : schema
		)
	}

	static writeDefaultDescription(inner: PredicateInner) {
		return `valid according to ${inner.predicate.name}`
	}

	static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `Cannot narrow ${getBasisName(basis)}`
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
