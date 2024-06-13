import { isArray, throwParseError, type Key } from "@arktype/util"
import type { Node } from "../kinds.js"
import type { BaseNode } from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { BoundKind } from "./implement.js"
import { hasArkKind, pathToPropString } from "./utils.js"

export interface DisjointEntry<kind extends DisjointKind = DisjointKind> {
	kind: kind
	l: OperandsByDisjointKind[kind]
	r: OperandsByDisjointKind[kind]
	path: Key[]
}

type OperandsByDisjointKind = {
	domain: Node<"domain">
	unit: Node<"unit">
	proto: Node<"proto">
	presence: BaseRoot
	range: Node<BoundKind>
	assignability: BaseNode
	union: readonly BaseRoot[]
}

export class Disjoints extends Array<DisjointEntry> {
	static init<kind extends DisjointKind>(
		kind: kind,
		l: OperandsByDisjointKind[kind],
		r: OperandsByDisjointKind[kind]
	): Disjoints {
		return new Disjoints({ kind, l, r, path: [] })
	}

	add<kind extends DisjointKind>(
		kind: kind,
		l: OperandsByDisjointKind[kind],
		r: OperandsByDisjointKind[kind]
	): Disjoints {
		this.push({ kind, l, r, path: [] })
		return this
	}

	describeReasons(): string {
		if (this.length === 1) {
			const { path, l, r } = this[0]
			const pathString = pathToPropString(path)
			return `Intersection${
				pathString && ` at ${pathString}`
			} of ${describeReasons(l, r)} results in an unsatisfiable type`
		}
		return `The following intersections result in unsatisfiable types:\n• ${this.map(
			({ path, l, r }) => `${path}: ${describeReasons(l, r)}`
		).join("\n• ")}`
	}

	throw(): never {
		return throwParseError(this.describeReasons())
	}

	invert(): Disjoints {
		return this.map(entry => ({
			...entry,
			l: entry.r,
			r: entry.l
		})) as Disjoints
	}

	withPrefixKey(key: string | symbol): Disjoints {
		return this.map(entry => ({
			...entry,
			path: [key, ...entry.path]
		})) as Disjoints
	}
}

export type DisjointKind = keyof OperandsByDisjointKind

const describeReasons = (l: unknown, r: unknown): string =>
	`${describeReason(l)} and ${describeReason(r)}`

const describeReason = (value: unknown): string =>
	hasArkKind(value, "root") ? value.expression
	: isArray(value) ? value.map(describeReason).join(" | ")
	: String(value)
