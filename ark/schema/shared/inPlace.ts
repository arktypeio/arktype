import { arityOf } from "@ark/util"
import type { MutatesInput } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import { precompileInPlace } from "../units.ts"
import { arrayIndexMatcher } from "../structure/shared.ts"
import type { StructureNode } from "../structure/structure.ts"
import { $ark } from "./registry.ts"
import type { RootApplyRuntime } from "./rootApply.ts"
import type { InPlaceTransforms } from "./transform.ts"
import { hasArkKind } from "./utils.ts"

// the keys of an object a place reads or a transform writes
interface Keys {
	every: boolean
	// an array's indices and length
	indices: boolean
	named: Set<PropertyKey>
}

interface Reads {
	values: Keys
	// whether a key is present, read where undeclared keys are checked
	everyPresence: boolean
}

interface Writes {
	values: Keys
	added: Keys
	// whether each key added is a default a later visit leaves as written
	addsOnlyDefaults: boolean
}

interface Place {
	node: BaseRoot
	// how many places hold it, at most 2
	count: number
	// the place it was first entered at, which nodes there share
	position: number
	afterFunction: boolean
}

const keys = (): Keys => ({ every: false, indices: false, named: new Set() })

const isEmpty = (k: Keys): boolean => !k.every && !k.indices && !k.named.size

const isIndexKey = (key: PropertyKey): boolean =>
	key === "length" || (typeof key === "string" && arrayIndexMatcher.test(key))

const meet = (l: Keys, r: Keys): boolean => {
	if ((l.every && !isEmpty(r)) || (r.every && !isEmpty(l))) return true
	if (l.indices && (r.indices || [...r.named].some(isIndexKey))) return true
	if (r.indices && [...l.named].some(isIndexKey)) return true
	for (const key of l.named) if (r.named.has(key)) return true
	return false
}

const canBeObject = (node: BaseRoot): boolean =>
	node.overlaps($ark.kw.object.internal)

// a structure that writes what it transforms, as one deleting undeclared
// keys copies all but the elements a sequence it doesn't slice transforms
const writerOf = (node: BaseNode): StructureNode | undefined => {
	const structure = node.is("intersection") ? node.structure : undefined
	if (!structure?.tfs) return
	if (
		structure.undeclared !== "delete" ||
		(structure.sequence?.tfs && !structure.slicesSeq)
	)
		return structure
}

// written in place, a transform returns its input or the errors it found
const returnsInput = (node: BaseNode, seen = new Set<BaseNode>()): boolean => {
	if (!node.tfs || seen.has(node)) return true
	seen.add(node)
	if (node.is("alias")) return returnsInput(node.resolution, seen)
	if (node.is("union"))
		return node.branches.every(branch => returnsInput(branch, seen))
	if (node.is("intersection"))
		return !!node.structure && node.structure.undeclared !== "delete"
	return false
}

const writesOf = (structure: StructureNode): Writes => {
	const writes: Writes = {
		values: keys(),
		added: keys(),
		addsOnlyDefaults: true
	}
	const sequence = structure.sequence
	if (sequence?.children.some(element => !returnsInput(element)))
		writes.values.indices = true
	if (structure.undeclared === "delete") return writes
	for (const prop of structure.props) {
		if (!returnsInput(prop.value)) writes.values.named.add(prop.key)
		if (prop.hasDef()) {
			writes.added.named.add(prop.key)
			if (prop.value.tfs) writes.addsOnlyDefaults = false
		}
	}
	if (structure.index?.some(index => !returnsInput(index.value)))
		writes.values.every = true
	if (sequence?.defaultables) {
		writes.added.indices = true
		if (sequence.defaultables.some(([node]) => node.tfs))
			writes.addsOnlyDefaults = false
	}
	return writes
}

const readsOf = (node: BaseRoot): Reads | undefined => {
	// a function can read any key of what it receives
	if (node.is("morph")) return canBeObject(node._in) ? everyRead() : undefined
	if (!node.is("intersection")) return
	if (node.inner.predicate) return everyRead()
	const structure = node.structure
	// a length bound reads the elements a tuple's defaults add
	const readsLength = !!(
		node.inner.exactLength ||
		node.inner.minLength ||
		node.inner.maxLength
	)
	if (!structure && !readsLength) return
	const reads: Reads = { values: keys(), everyPresence: false }
	if (readsLength) reads.values.indices = true
	if (!structure) return reads
	for (const prop of structure.props) reads.values.named.add(prop.key)
	if (structure.index) reads.values.every = true
	if (structure.sequence) reads.values.indices = true
	if (structure.handlesUndeclared) reads.everyPresence = true
	return reads
}

const everyRead = (): Reads => ({
	values: { every: true, indices: true, named: new Set() },
	everyPresence: true
})

// the places holding each node a valid input's transform reaches, by id
const placesOf = (root: BaseRoot): Map<string, Place> => {
	const places = new Map<string, Place>()
	let positions = 0
	const enter = (
		node: BaseRoot,
		count: number,
		position: number,
		afterFunction: boolean
	): void => {
		const place = places.get(node.id)
		if (place) {
			const entered = Math.min(2, place.count + count)
			if (entered === place.count && (place.afterFunction || !afterFunction))
				return
			place.count = entered
			place.afterFunction ||= afterFunction
			return visit(node, place.count, place.position, place.afterFunction)
		}
		places.set(node.id, { node, count, position, afterFunction })
		visit(node, count, position, afterFunction)
	}
	// a child at a new place is held there once per place its parent is
	const enterNew = (
		node: BaseRoot,
		count: number,
		afterFunction: boolean
	): void => enter(node, count, ++positions, afterFunction)
	const visit = (
		node: BaseRoot,
		count: number,
		position: number,
		afterFunction: boolean
	): void => {
		if (node.is("alias"))
			return enter(node.resolution, count, position, afterFunction)
		if (node.is("union")) {
			for (const branch of node.branches)
				enter(branch, count, position, afterFunction)
			return
		}
		if (node.is("morph")) {
			// its head and any node before its first function check data in place
			let piped = false
			for (const morph of node.morphs) {
				if (!hasArkKind(morph, "root")) piped = true
				else if (!piped) enter(morph, count, position, afterFunction)
				else enterNew(morph, count, true)
			}
			return
		}
		const structure = node.is("intersection") ? node.structure : undefined
		if (!structure) return
		for (const prop of structure.props)
			enterNew(prop.value, count, afterFunction)
		for (const index of structure.index ?? [])
			enterNew(index.value, 2, afterFunction)
		const sequence = structure.sequence
		if (!sequence) return
		for (const element of sequence.leading)
			enterNew(element.node, count, afterFunction)
		if (sequence.variadic) enterNew(sequence.variadic, 2, afterFunction)
		for (const element of sequence.postfix ?? [])
			enterNew(element, count, afterFunction)
	}
	enterNew(root, 1, false)
	return places
}

// a key two constraints transform, each reading the value as it received it
const transformsKeyTwice = (structure: StructureNode): boolean => {
	const writes = (node: BaseNode) =>
		node.hasAlias ||
		node.references.some(
			reference => reference.is("structure") && reference.tfs
		)
	const index = structure.index?.filter(index => index.value.tfs) ?? []
	if (!index.length) return false
	if (index.length > 1 && index.some(index => writes(index.value))) return true
	return structure.props.some(prop => {
		const steps = structure.tfsOf(prop)
		return steps.length > 1 && steps.some(step => writes(step.node))
	})
}

// a reader checked after the writer receives what it wrote
const overlaps = (writer: BaseRoot, reader: BaseRoot): boolean => {
	try {
		return writer._in.overlaps(reader._in) || writer._out.overlaps(reader._in)
	} catch {
		return true
	}
}

// whether a structure could write in place, without which nothing would
const holdsWriter = (places: Map<string, Place>): boolean => {
	for (const { node } of places.values()) if (writerOf(node)) return true
	return false
}

// whether writing in place returns what copying would
const writesSoundly = (places: Map<string, Place>): boolean => {
	for (const { node } of places.values()) {
		const structure = node.is("intersection") ? node.structure : undefined
		if (structure && transformsKeyTwice(structure)) return false
	}
	return true
}

// whether no place can read what another wrote
const writesUnread = (places: Map<string, Place>): boolean => {
	const readers: [Place, Reads][] = []
	for (const place of places.values()) {
		const reads = readsOf(place.node)
		if (reads) readers.push([place, reads])
	}
	for (const place of places.values()) {
		const writer = writerOf(place.node)
		if (!writer) continue
		// a function can return an object that outlives the call
		if (place.afterFunction) return false
		const writes = writesOf(writer)
		if (
			place.count > 1 &&
			(!isEmpty(writes.values) ||
				(!isEmpty(writes.added) && !writes.addsOnlyDefaults))
		)
			return false
		for (const [reader, reads] of readers) {
			if (
				reader === place ||
				(reader.count === 1 &&
					place.count === 1 &&
					reader.position === place.position)
			)
				continue
			if (
				(meet(writes.values, reads.values) ||
					meet(writes.added, reads.values) ||
					(reads.everyPresence && !isEmpty(writes.added))) &&
				overlaps(place.node, reader.node)
			)
				return false
		}
	}
	return true
}

/** arktype's morphs passed ctx that read only their input through it */
export const inputOnlyMorphs: WeakSet<Function> = new WeakSet()

// a morph passed ctx can read the input's writes through ctx.root
const passesContext = (places: Map<string, Place>): boolean => {
	for (const { node } of places.values()) {
		if (
			node.is("morph") &&
			node.morphs.some(
				morph =>
					!hasArkKind(morph, "root") &&
					arityOf(morph) !== 1 &&
					!inputOnlyMorphs.has(morph)
			)
		)
			return true
	}
	return false
}

const writesInPlaceByMode = {
	true: new WeakMap<BaseRoot, boolean>(),
	always: new WeakMap<BaseRoot, boolean>()
}

/** whether a valid input's transforms write into it */
export const writesInPlace = (
	root: BaseRoot,
	mutatesInput: MutatesInput | undefined
): boolean => {
	if (!mutatesInput || !root.tfs) return false
	const cache = writesInPlaceByMode[mutatesInput === true ? "true" : "always"]
	let writes = cache.get(root)
	if (writes === undefined) {
		const places = placesOf(root)
		writes =
			holdsWriter(places) &&
			writesSoundly(places) &&
			(mutatesInput !== true ||
				(!passesContext(places) && writesUnread(places)))
		cache.set(root, writes)
	}
	return writes
}

// in-place runtimes, by the runtime they extend
const inPlaceRuntimes = new WeakMap<RootApplyRuntime, RootApplyRuntime>()

const inPlaceRuntimeOf = (runtime: RootApplyRuntime): RootApplyRuntime => {
	let inPlace = inPlaceRuntimes.get(runtime)
	if (!inPlace) {
		class InPlaceTraversal extends runtime.Traversal {}
		InPlaceTraversal.prototype.inPlace = true
		inPlace = { ...runtime, Traversal: InPlaceTraversal }
		inPlaceRuntimes.set(runtime, inPlace)
	}
	return inPlace
}

const writesInPlaceAsConfigured = (root: BaseRoot) =>
	writesInPlace(root, root.$.cfg.mutatesInput)

const isWriter = (node: BaseNode): boolean =>
	(node.is("structure") || node.is("sequence")) && node.tfs

// a compiled transform copies what it writes, unless it reaches no writer
const copiesCompiled = (node: BaseNode): boolean =>
	node.tfs &&
	node.unitFn !== undefined &&
	(node.hasAlias || isWriter(node) || node.references.some(isWriter))

// the transforms a root's traversal can call, ignoring discrimination
const transformsCalledBy = (root: BaseRoot): BaseNode[] => {
	const called: BaseNode[] = []
	const call = (node: BaseNode) => {
		const structure = node.is("intersection") ? node.structure : undefined
		for (const reached of [node, structure, structure?.sequence])
			if (reached?.tfs) called.push(reached)
	}
	for (const { node } of placesOf(root).values()) {
		call(node)
		if (node.is("union")) for (const caseNode of node.caseNodes) call(caseNode)
	}
	return called
}

// transforms the running uncompiled in-place applies reach
let checking: Set<BaseNode> | undefined

export const inPlaceTransforms: InPlaceTransforms = {
	checksUncompiled: root => checking?.has(root) || !root.c.usedPreJit,
	checkedUncompiled: (root, apply) => {
		if (!writesInPlaceAsConfigured(root)) return apply
		const called = transformsCalledBy(root)
		if (called.some(copiesCompiled)) return
		return (data, onFail) => {
			const outer = checking
			checking = new Set([...(outer ?? []), ...called])
			try {
				return apply(data, onFail)
			} finally {
				checking = outer
			}
		}
	},
	get checking() {
		return checking
	},
	applied: root => {
		const { unbound } = root.c
		root.c.unbound = undefined
		if (!writesInPlaceAsConfigured(root)) return root
		if (!root.c.applyInPlace) precompileInPlace(root, unbound)
		return Object.assign(Object.create(root), {
			tApply: root.c.applyInPlace,
			tTransform: root.c.transformInPlace
		})
	},
	runtimeOf: (root, runtime) =>
		writesInPlaceAsConfigured(root) ? inPlaceRuntimeOf(runtime) : runtime
}
