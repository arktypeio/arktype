import type { entryOf } from "@arktype/util"
import {
	entriesOf,
	fromEntries,
	stringify,
	throwInternalError,
	throwParseError,
	transform
} from "@arktype/util"
import type { ConstraintKind } from "./constraints/constraint.js"
import type { DomainNode } from "./constraints/domain.js"
import type { ProtoNode } from "./constraints/proto.js"
import type { UnitNode } from "./constraints/unit.js"
import type { Node } from "./node.js"
import { type BranchNode } from "./types/type.js"

type DisjointKinds = {
	domain?: {
		l: DomainNode
		r: DomainNode
	}
	unit?: {
		l: UnitNode
		r: UnitNode
	}
	proto?: {
		l: ProtoNode
		r: ProtoNode
	}
	// TODO: test
	presence?:
		| {
				l: true
				r: false
		  }
		| {
				l: false
				r: true
		  }
	bound?: {
		l: Node<"min" | "max">
		r: Node<"min" | "max">
	}
	assignability?:
		| {
				l: unknown
				r: Node<ConstraintKind>
		  }
		| {
				l: Node<ConstraintKind>
				r: unknown
		  }
	union?: {
		l: readonly BranchNode[]
		r: readonly BranchNode[]
	}
}

export type DisjointKindEntries = entryOf<DisjointKinds>[]

export type SerializedPath = `[${string}]`

export type DisjointsSources = {
	[k in `${SerializedPath}`]: DisjointsAtPath
}

export type DisjointsAtPath = {
	[kind in DisjointKind]?: DisjointKinds[kind]
}

export type DisjointSourceEntry = entryOf<DisjointsSources>

export type DisjointKind = keyof DisjointKinds

export class Disjoint {
	constructor(public sources: DisjointsSources) {}

	static from<kind extends DisjointKind>(
		kind: kind,
		l: Required<DisjointKinds>[kind]["l"],
		r: Required<DisjointKinds>[kind]["r"]
	) {
		return new Disjoint({
			"[]": {
				[kind]: {
					l,
					r
				}
			}
		})
	}

	static fromEntries(entries: DisjointKindEntries) {
		if (!entries.length) {
			return throwInternalError(
				`Unexpected attempt to create a disjoint from no entries`
			)
		}
		return new Disjoint({ "[]": fromEntries(entries) })
	}

	get flat() {
		return entriesOf(this.sources).flatMap(([path, disjointKinds]) =>
			entriesOf(disjointKinds).map(([kind, disjoint]) => ({
				path,
				kind,
				disjoint
			}))
		)
	}

	describeReasons() {
		const reasons = this.flat
		if (reasons.length === 1) {
			const { path, disjoint } = reasons[0]
			const pathString = JSON.parse(path).join(".")
			return `Intersection${pathString && ` at ${pathString}`} of ${
				disjoint.l
			} and ${disjoint.r} results in an unsatisfiable type`
		}
		return `The following intersections result in unsatisfiable types:\n• ${reasons
			.map(({ path, disjoint }) => `${path}: ${disjoint.l} and ${disjoint.r}`)
			.join("\n• ")}`
	}

	throw() {
		return throwParseError(this.describeReasons())
	}

	invert() {
		const invertedEntries = entriesOf(this.sources).map(
			([path, disjoints]) =>
				[
					path,
					transform(disjoints, ([kind, disjoint]) => [
						kind,
						{ l: disjoint.r, r: disjoint.l }
					])
				] as DisjointSourceEntry
		)
		return new Disjoint(fromEntries(invertedEntries))
	}

	withPrefixKey(key: string) {
		const entriesWithPrefix = entriesOf(this.sources).map(
			([path, disjoints]): DisjointSourceEntry => {
				const segments = JSON.parse(path) as string[]
				segments.unshift(key)
				const pathWithPrefix = JSON.stringify(segments) as `[${string}]`
				return [pathWithPrefix, disjoints]
			}
		)
		return new Disjoint(fromEntries(entriesWithPrefix))
	}

	toString() {
		return stringify(this.sources)
	}
}
