import {
	CompiledFunction,
	DynamicBase,
	includes,
	throwInternalError,
	type Json,
	type entriesOf
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.ts"
import type {
	ClosedConstraintKind,
	ConstraintKind,
	OpenConstraintKind
} from "./constraints/constraint.ts"
import { In } from "./io/compile.ts"
import { arkKind, registry } from "./io/registry.ts"
import { parseSchema } from "./parse.ts"
import { unflattenRules } from "./sets/intersection.ts"
import type { ValidatorNode } from "./sets/morph.ts"
import type { BaseAttributes } from "./shared/declare.ts"
import {
	basisKinds,
	closedConstraintKinds,
	constraintKinds,
	openConstraintKinds,
	rootKinds,
	ruleKinds,
	type NodeKind,
	type RootKind,
	type RuleKind,
	type SetKind,
	type UnknownNodeImplementation
} from "./shared/define.ts"
import { Disjoint } from "./shared/disjoint.ts"
import { leftOperandOf, type intersectionOf } from "./shared/intersect.ts"
import {
	NodeImplementationByKind,
	type Attachments,
	type Inner,
	type Node
} from "./shared/node.ts"

export type UnknownNode = BaseNode<any>

const $ark = registry()

export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: UnknownNode[]
	readonly id: string
	readonly typeId: string
}

export abstract class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends DynamicBase<Inner<kind> & Attachments<kind> & BaseAttachments<kind>> {
	readonly [arkKind] = "node"
	readonly ctor = BaseNode

	readonly implementation: UnknownNodeImplementation = NodeImplementationByKind[
		this.kind
	] as never
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly references = this.children.flatMap(
		(child) => child.contributesReferences
	)
	readonly contributesReferences: readonly UnknownNode[] = [
		this,
		...this.references
	]
	readonly allows: (data: unknown) => data is t
	readonly alias: string = $ark.register(this, this.inner.alias)
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
		this.allows = new CompiledFunction(
			In,
			this.isRule()
				? `return ${this.condition}`
				: (this as {} as Node<SetKind>).compile({
						successKind: "true",
						failureKind: "false"
				  })
		)
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
	}

	inCache?: UnknownNode;
	get in(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: UnknownNode
	get out(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
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
			if (v instanceof BaseNode) {
				ioInner[k] = v[kind]
			} else if (
				Array.isArray(v) &&
				v.every((_): _ is UnknownNode => _ instanceof BaseNode)
			) {
				ioInner[k] = v.map((child) => child[kind])
			} else {
				ioInner[k] = v
			}
		}
		return parseSchema(this.kind, ioInner)
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

	isClosedConstraint(): this is Node<ClosedConstraintKind> {
		return includes(closedConstraintKinds, this.kind)
	}

	isOpenConstraint(): this is Node<OpenConstraintKind> {
		return includes(openConstraintKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	isRoot(): this is Node<RootKind> {
		return includes(rootKinds, this.kind)
	}

	isRule(): this is Node<RuleKind> {
		return includes(ruleKinds, this.kind)
	}

	toString() {
		return this.description
	}

	// TODO: add input kind, caching
	intersect<other extends Node>(
		other: other
	): intersectionOf<kind, other["kind"]>
	intersect(other: UnknownNode): UnknownNode | Disjoint {
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			return closedResult as UnknownNode | Disjoint
		}
		if (!this.isRule() || !other.isRule()) {
			return throwInternalError(
				`Unexpected null intersection between non-rules ${this.kind} and ${other.kind}`
			)
		}
		return parseSchema(
			"intersection",
			unflattenRules([this as never, other]) as never
		)
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
			return parseSchema(l.kind, result) as never
		}
		return null
	}
}
