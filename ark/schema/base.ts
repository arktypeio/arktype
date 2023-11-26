import {
	CompiledFunction,
	DynamicBase,
	includes,
	isArray,
	throwInternalError,
	type Json,
	type entriesOf,
	type listable
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.js"
import type { ScopeNode } from "./scope.js"
import { unflattenConstraints } from "./sets/intersection.js"
import type { ValidatorKind } from "./sets/morph.js"
import {
	In,
	compilePropAccess,
	type CheckResult,
	type CompilationContext,
	type CompilationKind
} from "./shared/compilation.js"
import type { BaseAttributes } from "./shared/declare.js"
import {
	basisKinds,
	closedRefinementKinds,
	constraintKinds,
	openRefinementKinds,
	refinementKinds,
	setKinds,
	typeKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type NodeKind,
	type OpenRefinementKind,
	type RefinementKind,
	type SetKind,
	type TypeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import { leftOperandOf, type intersectionOf } from "./shared/intersect.js"
import {
	NodeImplementationByKind,
	type Attachments,
	type Inner,
	type childKindOf,
	type reducibleKindOf
} from "./shared/nodes.js"
import { arkKind } from "./shared/registry.js"
import type { Schema } from "./type.js"

export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: Node<childKindOf<kind>>[]
	readonly id: string
	readonly typeId: string
	readonly scope: ScopeNode
}

export abstract class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends DynamicBase<Inner<kind> & Attachments<kind> & BaseAttachments<kind>> {
	readonly [arkKind] = "node"
	readonly cls = BaseNode

	readonly implementation: UnknownNodeImplementation = NodeImplementationByKind[
		this.kind
	] as never
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly alias = $ark.register(this)
	readonly referencesById: Record<string, UnknownNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly UnknownNode[] = Object.values(
		this.referencesById
	)
	readonly contributesReferencesById: Record<string, UnknownNode> =
		this.id in this.referencesById
			? this.referencesById
			: { ...this.referencesById, [this.alias]: this }
	readonly contributesReferences: readonly UnknownNode[] = Object.values(
		this.contributesReferencesById
	)
	readonly allows: (data: unknown) => data is t
	readonly traverse: (data: unknown) => CheckResult<t>
	readonly description: string

	protected constructor(baseAttachments: BaseAttachments<kind>) {
		super(baseAttachments as never)
		for (const k in baseAttachments.inner) {
			if (k in this) {
				// if we attempt to overwrite an existing node key, throw unless
				// it is expected and can be safely ignored.
				// in and out cannot overwrite their respective getters, so instead
				// morph assigns them to `inCache` and `outCache`
				if (k !== "in" && k !== "out" && k !== "description") {
					throwInternalError(
						`Unexpected attempt to overwrite existing node key ${k} from ${this.kind} inner`
					)
				}
			} else {
				this[k] = this.inner[k] as never
			}
		}
		const attachments = this.implementation.attach(this as never)
		Object.assign(this, attachments)
		// important this is last as writeDefaultDescription could rely on attached
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
		this.allows = this.compile("allows")
		this.traverse = this.compile("traverse")
	}

	// TODO: Cache
	compile<kind extends CompilationKind>(kind: kind): this[kind] {
		const $ = this.contributesReferences
			.map((reference) =>
				reference.compileReference({
					compilationKind: kind,
					path: [],
					discriminants: []
				})
			)
			.join("\n")
		if (kind === "allows") {
			return new CompiledFunction($ + "\n" + `return ${this.alias}`)() as never
		}
		return new CompiledFunction(
			In,
			$ +
				"\n" +
				`const problems = []
	${this.alias}(${In}, problems)
	if(problems.length === 0) {
		return { data: ${In} }
	}
	return { problems }`
		)
	}

	// TODO: Cache
	compileReference(ctx: CompilationContext) {
		return `function ${this.alias}(${In}){${this.implementation.compile(
			this as never,
			ctx
		)}}`
	}

	compileInvocation(ctx: CompilationContext, prop?: string) {
		return `${this.alias}(${In}${
			prop === undefined ? "" : compilePropAccess(prop)
		}${ctx.compilationKind === "traverse" ? ", problems" : ""})`
	}

	inCache?: UnknownNode;
	get in(): Node<kind extends "morph" ? ValidatorKind : reducibleKindOf<kind>> {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: UnknownNode
	get out(): Node<
		kind extends "morph" ? ValidatorKind : reducibleKindOf<kind>
	> {
		if (!this.outCache) {
			this.outCache = this.getIo("out")
		}
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): UnknownNode {
		if (!this.includesMorph) {
			return this
		}
		const ioInner: Record<string, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.implementation.keys[k as keyof BaseAttributes]!
			if (keyDefinition.meta) {
				continue
			}
			if (keyDefinition.child) {
				const childValue = v as listable<BaseNode>
				ioInner[k] = isArray(childValue)
					? childValue.map((child) => child[kind])
					: childValue[kind]
			} else {
				ioInner[k] = v
			}
		}
		return this.scope.node(this.kind, ioInner)
	}

	toJSON() {
		return this.json
	}

	equals(other: UnknownNode) {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isClosedRefinement(): this is Node<ClosedRefinementKind> {
		return includes(closedRefinementKinds, this.kind)
	}

	isOpenRefinement(): this is Node<OpenRefinementKind> {
		return includes(openRefinementKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isSchema(): this is Node<TypeKind> {
		return includes(typeKinds, this.kind)
	}

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	toString() {
		return this.description
	}

	private static intersectionCache: Record<string, UnknownNode | Disjoint> = {}
	intersect<other extends Node>(
		other: other
	): intersectionOf<kind, other["kind"]>
	intersect(other: UnknownNode): UnknownNode | Disjoint | null {
		const cacheKey = `${this.typeId}&${other.typeId}`
		if (BaseNode.intersectionCache[cacheKey] !== undefined) {
			return BaseNode.intersectionCache[cacheKey]
		}
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			BaseNode.intersectionCache[cacheKey] = closedResult
			BaseNode.intersectionCache[`${other.typeId}&${this.typeId}`] =
				// also cache the result with other's condition as the key.
				// if it was a Disjoint, it has to be inverted so that l,r
				// still line up correctly
				closedResult instanceof Disjoint ? closedResult.invert() : closedResult
			return closedResult
		}
		if (this.isSet() || other.isSet()) {
			return throwInternalError(
				`Unexpected null intersection between non-constraints ${this.kind} and ${other.kind}`
			)
		}
		// if either constraint is a basis or both don't require a basis (i.e.
		// are predicates), it can form an intersection
		return this.isBasis() ||
			other.isBasis() ||
			(this.kind === "predicate" && other.kind === "predicate")
			? this.scope.node(
					"intersection",
					unflattenConstraints([this as never, other])
			  )
			: null
	}

	intersectClosed<other extends Node>(
		other: other
	): Node<kind | other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this, other)
		const thisIsLeft = l === this
		const r: UnknownNode = thisIsLeft ? other : this
		const intersections = l.implementation.intersections
		const intersector = (intersections as any)[r.kind] ?? intersections.default
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta
			return this.scope.node(l.kind, result) as never
		}
		return null
	}
}

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends TypeKind ? Schema<kind, t> : BaseNode<kind, t>

export type UnknownNode = BaseNode<any>
