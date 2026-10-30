import {
	isNode,
	type BaseNode,
	type BaseRoot,
	type DefaultedNode,
	type IntersectionNode,
	type Optional,
	type RootUnit,
	type Sequence,
	type UnitMember
} from "@ark/schema"
import { hasDomain, isDate } from "@ark/util"
import { noIssueFeatures, type Baking, type IssueFeatures } from "./baking.ts"
import { rootUnitsOf, unitOf } from "./compilers.ts"
import { addIssueFeatures } from "./sites.ts"
import { holdsLocal } from "./values.ts"

export interface Written {
	issues: IssueFeatures
	metas: Set<object>
	keyLookups: Set<object>
	patternInstances: Set<RegExp>
	defaultsByMorph: Map<unknown, CollectedDefault>
	objectUnits: Set<unknown>
}

export const writtenByUnits = new WeakMap<readonly RootUnit[], Written>()

export const readWritten = (
	units: readonly RootUnit[],
	nodes: readonly BaseNode[]
): Written => {
	const written: Written = {
		issues: { ...noIssueFeatures },
		metas: new Set(),
		keyLookups: new Set(),
		patternInstances: new Set(),
		defaultsByMorph: new Map(),
		objectUnits: new Set()
	}
	addIssueFeatures(written.issues, units, nodes)
	for (const node of nodes) {
		written.metas.add(node.meta)
		if (node.is("structure")) written.keyLookups.add(node.byKey)
		else if (node.is("pattern")) written.patternInstances.add(node.instance)
		else if (node.is("optional") || node.is("sequence"))
			collectDefaults(node, written.defaultsByMorph)
		else if (
			node.is("unit") &&
			hasDomain(node.unit, "object") &&
			!isDate(node.unit)
		)
			written.objectUnits.add(node.unit)
	}
	return written
}

export type CollectedDefault = [
	key: PropertyKey,
	value: BaseRoot,
	defaultValue: unknown
]

export const defaultedNodeKeys = [
	"alters",
	"hasAlias",
	"allowsCtx",
	"ctxMorph",
	"tfs"
] as const satisfies (keyof DefaultedNode)[]

export const collectDefaults = (
	node: Optional.Node | Sequence.Node,
	defaultsByMorph: Map<unknown, CollectedDefault>
): void => {
	if (node.is("optional")) {
		if (node.defMorph) {
			defaultsByMorph.set(node.defMorph, [
				node.key,
				node.value,
				node.inner.default
			])
		}
		return
	}
	for (let i = 0; i < node.defMorphs.length; i++) {
		const [value, defaultValue] = node.defaultables![i]
		defaultsByMorph.set(node.defMorphs[i], [
			node.preLen + i,
			value,
			defaultValue
		])
	}
}

export const calledMembersOf = (
	members: readonly UnitMember[],
	readers: readonly string[]
): UnitMember[] => {
	const sourcesByName = new Map(members)
	const called = new Set<string>()
	const read = (text: string) => {
		for (const name of text.match(/[\w$]+/g) ?? []) {
			if (called.has(name) || !sourcesByName.has(name)) continue
			called.add(name)
			read(sourcesByName.get(name)!)
		}
	}
	for (const reader of readers) read(reader)
	return members.filter(([name]) => called.has(name))
}

// a traversal only calling another of its unit is that one
export const forwardedOf = (
	members: readonly UnitMember[]
): Map<string, string> => {
	const sourcesByName = new Map(members)
	const targetsByName = new Map<string, string>()
	for (const [name, source] of members) {
		const [, target, passesCtx] =
			/^function\(data, ctx\) {\s*return (?:\/\* @__NOINLINE__ \*\/ )?([\w$]+)\(data(, ctx)?\)\s*}$/.exec(
				source
			) ?? []
		const targetSource = sourcesByName.get(target)
		// a structure transforming its sequence keeps the call into it
		if (
			targetSource &&
			!targetSource.includes("transformedSequence") &&
			(passesCtx ||
				!/\bctx\b/.test(targetSource.slice("function(data, ctx)".length)))
		)
			targetsByName.set(name, target)
	}
	const forwarded = new Map<string, string>()
	for (const [name, first] of targetsByName) {
		let target = first
		for (let i = 0; i < targetsByName.size && targetsByName.has(target); i++)
			target = targetsByName.get(target)!
		if (!targetsByName.has(target)) forwarded.set(name, target)
	}
	return forwarded
}

// a unified traversal is returned once, as its Allows
export const returnedOf = (unit: RootUnit, baking: Baking): string[] =>
	unit.traversals.flatMap(([allows, apply, ...transform]) => [
		allows,
		baking.detailsErrors && apply !== allows ? apply : "",
		...transform
	])

export const namesReadBy = (unit: RootUnit, returned: string[]): Set<string> =>
	new Set(
		calledMembersOf(unit.members, returned).flatMap(
			([, source]) => source.match(/[\w$]+/g) ?? []
		)
	)

// strict even where a bundle's CJS or IIFE output isn't
export const isWriting = (member: string): boolean =>
	member.endsWith("Transform") || member.endsWith("Copy")

const readUnitsOf = (unit: RootUnit): RootUnit[] =>
	[
		...Object.values(unit.dependencies).map(([node]) => node),
		...unit.refs.filter(ref => isNode(ref) && ref.isRoot())
	].map(node => unitOf(node as BaseNode, unit))

export const isVariadicArray = (root: BaseRoot): root is IntersectionNode =>
	root.is("intersection") &&
	root.basis?.is("proto") === true &&
	root.basis.proto === Array &&
	Object.keys(root.inner).length === 2 &&
	Object.keys(root.structure?.inner ?? {}).join() === "sequence" &&
	Object.keys(root.structure!.sequence!.inner).join() === "variadic"

const sharedByUnit = new WeakMap<RootUnit, boolean>()

export const isSharedUnit = (unit: RootUnit): boolean => {
	let shared = sharedByUnit.get(unit)
	if (shared === undefined) {
		// a cyclic unit is decided by what else it reads
		sharedByUnit.set(unit, true)
		shared =
			!unit.identityNamed.has(unit.roots[0].id) &&
			!unit.refs.some(ref => !isNode(ref) && holdsLocal(ref)) &&
			readUnitsOf(unit).every(isSharedUnit)
		sharedByUnit.set(unit, shared)
	}
	return shared
}

const selectedByUnits = new WeakMap<
	readonly RootUnit[],
	Map<(node: BaseNode) => boolean, BaseNode[]>
>()

// each unit's declared nodes, then its roots' references, which a parent checks inline
export const writtenSelectedOf = (
	units: readonly RootUnit[],
	selects: (node: BaseNode) => boolean
): readonly BaseNode[] => {
	let byPredicate = selectedByUnits.get(units)
	if (!byPredicate) selectedByUnits.set(units, (byPredicate = new Map()))
	let selected = byPredicate.get(selects)
	if (!selected) {
		selected = []
		for (const unit of units) {
			for (const node of unit.declared) if (selects(node)) selected.push(node)
			for (const root of unit.roots)
				for (const node of root.selectReferences(selects)) selected.push(node)
		}
		byPredicate.set(selects, selected)
	}
	return selected
}

// a meta holding an object, which can hold a Type
export const holdsObjectMeta = (node: BaseNode): boolean =>
	Object.values(node.meta).some(v => hasDomain(v, "object"))

export const holdsDefaults = (node: BaseNode): boolean =>
	node.is("optional") ?
		!!node.defMorph
	:	node.is("sequence") && !!node.defaultables?.length

export const declares = (
	root: BaseRoot,
	predicate: (node: BaseNode) => boolean
): boolean => rootUnitsOf(root).some(unit => unit.declared.some(predicate))
