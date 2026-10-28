import {
	$ark,
	Disjoint,
	compileLiteralPropAccess,
	compileSerializedValue,
	constraintInputOf,
	flatMorphsAreEqual,
	flatRefsAreEqual,
	hashesMatch,
	isResolutionFinal,
	queueUnchecked,
	type BaseNode,
	type BaseRange,
	type BaseRoot,
	type BaseScope,
	type CaseContext,
	type CaseDiscriminant,
	type CaseKey,
	type Discriminant,
	type DiscriminantKind,
	type DiscriminantLocation,
	type DiscriminatedCases,
	type DisjointEntry,
	type Domain,
	type FlatRef,
	type Intersection,
	type IntersectionContext,
	type Morph,
	type NodeKind,
	type Prop,
	type Sequence,
	type Union,
	type Unit
} from "@ark/schema"
import {
	appendUnique,
	arrayEquals,
	flatMorph,
	type dict,
	integerLikeMatcher,
	isDate,
	range,
	throwParseError,
	type JsonStructure
} from "@ark/util"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { sortSiblings } from "../constraint.ts"
import { intersectNodesRoot, intersectOrPipeNodes } from "../intersections.ts"

export const unionImplementation: setImplementationOf<Union.Declaration> = {
	sort: inner => {
		if (!inner.ordered) inner.branches = sortSiblings(inner.branches)
	},
	reduce: (inner, $) => {
		const reducedBranches = reduceBranches({
			...inner,
			branches: mergeMorphBranches(inner.branches, $)
		})
		if (reducedBranches.length === 1) return reducedBranches[0]

		if (!inner.ordered && isUnknownUnion(reducedBranches))
			return $.node("intersection", {}, { reduced: true })

		if (reducedBranches.length === inner.branches.length) return

		return $.node(
			"union",
			{
				...inner,
				branches: reducedBranches
			},
			{ reduced: true }
		)
	},
	intersections: {
		union: (l, r, ctx) => {
			if (l.isNever !== r.isNever) {
				// if exactly one operand is never, we can use it to discriminate based on presence
				return Disjoint.init("presence", l, r)
			}
			let resultBranches: readonly Union.ChildNode[] | Disjoint
			if (l.ordered) {
				if (r.ordered) {
					throwParseError(
						writeOrderedIntersectionMessage(l.expression, r.expression)
					)
				}

				resultBranches = intersectBranches(r.branches, l.branches, ctx)
				if (resultBranches instanceof Disjoint) resultBranches.invert()
			} else resultBranches = intersectBranches(l.branches, r.branches, ctx)

			if (resultBranches instanceof Disjoint) return resultBranches

			return ctx.$.node(
				"union",
				unionInner(resultBranches, l.ordered || r.ordered)
			)
		},
		...defineRightwardIntersections("union", (l, r, ctx) => {
			const branches = intersectBranches(l.branches, [r], ctx)
			if (branches instanceof Disjoint) return branches

			if (branches.length === 1) return branches[0]

			return ctx.$.node("union", unionInner(branches, l.ordered))
		})
	}
}

// an ordered union's branches stay in the order given
const unionInner = (
	branches: readonly BaseRoot[],
	ordered: boolean | undefined
): Union.Input => (ordered ? { branches, ordered: true } : { branches })

// a switch compares by ===, which never matches NaN and compares a Date by reference
const isCaseUnit = (node: Unit.Node): boolean =>
	!isDate(node.unit) && !Number.isNaN(node.unit)

const isUndefinedCase = (k: string) => k === "undefined" || k === '"undefined"'

export const discriminateUnion = (node: Union.Node): Discriminant | null => {
	if (node.branches.length < 2) return null
	if (node.unitBranches.length === node.branches.length) {
		// a union of units lists each of them if any can't be a case
		if (!node.unitBranches.every(n => isCaseUnit(n._in as Unit.Node)))
			return null
		const cases = flatMorph(node.unitBranches, (i, n) => [
			`${(n._in as Unit.Node).jsUnit}`,
			n.is("morph") ? n : (true as const)
		])

		return {
			kind: "unit",
			path: [],
			pathStr: "data",
			cases
		}
	}
	const candidates: DiscriminantCandidate[] = []
	for (let lIndex = 0; lIndex < node.branches.length - 1; lIndex++) {
		const l = node.branches[lIndex]
		for (let rIndex = lIndex + 1; rIndex < node.branches.length; rIndex++) {
			const r = node.branches[rIndex]
			const result = intersectNodesRoot(l._in, r._in, l.$)
			if (!(result instanceof Disjoint)) continue

			for (const entry of result) {
				if (!entry.kind || entry.optional) continue

				if (entry.kind === "union") {
					addUnitCases(
						candidates,
						entry as DisjointEntry<"union">,
						lIndex,
						rIndex
					)
					continue
				}

				let lSerialized: string
				let rSerialized: string

				if (entry.kind === "domain") {
					const lValue = entry.l as Domain.Node | Domain.Enumerable
					const rValue = entry.r as Domain.Node | Domain.Enumerable
					lSerialized = `"${typeof lValue === "string" ? lValue : lValue.domain}"`
					rSerialized = `"${typeof rValue === "string" ? rValue : rValue.domain}"`
				} else if (entry.kind === "unit") {
					const lUnit = entry.l as Unit.Node
					const rUnit = entry.r as Unit.Node
					if (!isCaseUnit(lUnit) || !isCaseUnit(rUnit)) continue
					lSerialized = lUnit.jsUnit
					rSerialized = rUnit.jsUnit
				} else continue

				// an optional chain reads undefined at a missing key or below a non-object
				if (
					entry.path.length &&
					(isUndefinedCase(lSerialized) || isUndefinedCase(rSerialized))
				)
					continue

				const matching = candidates.find(
					d => arrayEquals(d.path, entry.path) && d.kind === entry.kind
				)
				const cases = matching?.cases ?? {}
				addCase(cases, lSerialized, lIndex, entry.l)
				addCase(cases, rSerialized, rIndex, entry.r)
				if (!matching)
					candidates.push({ kind: entry.kind, cases, path: entry.path })
			}
		}
	}

	// a pair's disjoint is its first differing key, so a branch may hold a case
	// at a key no pair recorded
	for (const candidate of candidates) {
		const cases = Object.values(candidate.cases) as CaseContext[]
		for (let i = 0; i < node.branches.length; i++) {
			if (cases.some(c => c.branchIndices.includes(i))) continue
			for (const [k, condition] of casesHeldAt(node.branches[i], candidate))
				addCase(candidate.cases, k, i, condition)
		}
	}

	const viableCandidates =
		node.ordered ?
			viableOrderedCandidates(candidates, node.branches)
		:	candidates

	if (!viableCandidates.length) return null

	const ctx = createCaseResolutionContext(viableCandidates, node)

	const cases: DiscriminatedCases = {}
	let members: Discriminant["members"]

	for (const k in ctx.best.cases) {
		const resolution = resolveCase(ctx, k)

		if (resolution === null) {
			cases[k] = true
			continue
		}

		// if all the branches ended up back in pruned, we'd loop if we continued
		// so just bail out- nothing left to discriminate
		if (resolution.length === node.branches.length) return null

		if (node.ordered) {
			// ensure the original order of the pruned branches is preserved
			resolution.sort((l, r) => l.originalIndex - r.originalIndex)
		}

		const branches = resolution.map(entry => entry.branch)

		const caseNode =
			branches.length === 1 ?
				branches[0]
			:	node.$.node("union", unionInner(branches, node.ordered))

		node.caseNodes.push(caseNode)
		cases[k] = caseNode
		const branch = node.branches[resolution[0].originalIndex]
		if (branches.length === 1 && branch.hasAlias) (members ??= {})[k] = branch
	}

	if (ctx.defaultPairs.length) {
		// we don't have to worry about order here as it is always preserved
		// within defaultPairs
		const branches = ctx.defaultPairs.map(entry => entry.branch)
		cases.default = node.$.node("union", unionInner(branches, node.ordered), {
			reduced: true
		})

		node.caseNodes.push(cases.default)
	}

	return Object.assign(ctx.location, members ? { cases, members } : { cases })
}

// each unit of literal unions disjoint at a path is its own case, so data
// matching none misses every branch
const addUnitCases = (
	candidates: DiscriminantCandidate[],
	entry: DisjointEntry<"union">,
	lIndex: number,
	rIndex: number
) => {
	const isCase = (branch: BaseRoot): branch is Unit.Node =>
		branch.is("unit") &&
		isCaseUnit(branch) &&
		!(entry.path.length && isUndefinedCase(branch.jsUnit))
	if (!entry.l.every(isCase) || !entry.r.every(isCase)) return
	let candidate = candidates.find(
		d => arrayEquals(d.path, entry.path) && d.kind === "unit"
	)
	if (!candidate) {
		candidate = { kind: "unit", cases: {}, path: entry.path }
		candidates.push(candidate)
	}
	for (const unit of entry.l)
		addCase(candidate.cases, unit.jsUnit, lIndex, unit)
	for (const unit of entry.r)
		addCase(candidate.cases, unit.jsUnit, rIndex, unit)
}

// the cases a branch holds at a candidate's path, each key to it required, as
// a disjoint there finds them
const casesHeldAt = (
	branch: BaseRoot,
	{ kind, path }: DiscriminantCandidate
): [k: string, condition: unknown][] => {
	let value = branch._in
	for (const k of path) {
		const prop =
			typeof k === "number" || !value.is("intersection") ?
				undefined
			:	value.structure?.byKey[k]
		if (!prop?.required) return []
		value = prop.value
	}
	const values = value.is("union") ? value.branches : [value]
	if (kind === "unit") {
		const units = values.filter(
			(v): v is Unit.Node =>
				v.is("unit") &&
				isCaseUnit(v) &&
				!(path.length && isUndefinedCase(v.jsUnit))
		)
		if (units.length !== values.length) return []
		return units.map(unit => [unit.jsUnit, unit])
	}
	const domains = new Set(values.map(domainCaseOf))
	if (domains.size !== 1) return []
	const [domain] = domains
	if (!domain || (path.length && domain === "undefined")) return []
	return [
		[
			`"${domain}"`,
			value.is("domain") ? value
			: domain === "undefined" || domain === "null" || domain === "boolean" ?
				domain
			:	$ark.kw[domain]
		]
	]
}

const domainCaseOf = (node: BaseRoot): Domain | undefined => {
	if (node.is("unit")) return node.domain
	if (node.is("domain")) return node.domain
	const basis = node.is("intersection") ? node.basis : null
	return (
		basis?.is("domain") ? basis.domain
		: basis?.is("proto") ? "object"
		: undefined
	)
}

const addCase = (
	cases: CandidateCases,
	k: string,
	branchIndex: number,
	condition: unknown
) => {
	if (cases[k])
		cases[k].branchIndices = appendUnique(cases[k].branchIndices, branchIndex)
	else
		cases[k] = { branchIndices: [branchIndex], condition: condition as never }
}

type CaseResolutionContext = {
	best: DiscriminantCandidate
	location: DiscriminantLocation
	defaultPairs: BranchEntry[]
	node: Union.Node
}

type BranchEntry = {
	originalIndex: number
	branch: BaseRoot
}

const createCaseResolutionContext = (
	viableCandidates: DiscriminantCandidate[],
	node: Union.Node
): CaseResolutionContext => {
	const covering = new Set(
		viableCandidates.filter(c => holdsEveryBranch(c, node.branches.length))
	)
	// shorter paths first, then keys every branch holds (no default case), then
	// the most cases
	const ordered = viableCandidates.sort(
		(l, r) =>
			l.path.length - r.path.length ||
			Number(covering.has(r)) - Number(covering.has(l)) ||
			Object.keys(r.cases).length - Object.keys(l.cases).length
	)

	const best = ordered[0]

	const location: DiscriminantLocation = {
		kind: best.kind,
		path: best.path,
		pathStr: optionallyChainPropString(best.path)
	}

	const defaultPairs = node.branches.map(
		(branch, originalIndex): BranchEntry => ({
			originalIndex,
			branch
		})
	)

	return {
		best,
		location,
		defaultPairs,
		node
	}
}

const holdsEveryBranch = (
	candidate: DiscriminantCandidate,
	branchCount: number
): boolean => {
	const held = new Set<number>()
	for (const { branchIndices } of Object.values(candidate.cases))
		for (const i of branchIndices) held.add(i)
	return held.size === branchCount
}

const resolveCase = (
	ctx: CaseResolutionContext,
	key: CaseKey
): BranchEntry[] | null => {
	const caseCtx = ctx.best.cases[key]
	const discriminantNode = discriminantCaseToNode(
		caseCtx.condition,
		ctx.location.path,
		ctx.node.$
	)
	let primitiveDiscriminantNode: BaseRoot | undefined

	let resolvedEntries: BranchEntry[] | null = []
	const nextDefaults: BranchEntry[] = []

	// a branch with several units at the path, like "'a' | 'b'", is a case of each
	for (const originalIndex of caseCtx.branchIndices) {
		const pruned = pruneDiscriminant(
			ctx.node.branches[originalIndex],
			ctx.location
		)
		if (pruned === null) {
			// if any branch of the union has no constraints (i.e. is
			// unknown), the others won't affect the resolution type, but could still
			// remove additional cases from defaultPairs
			resolvedEntries = null
		} else resolvedEntries?.push({ originalIndex, branch: pruned })
	}

	for (let i = 0; i < ctx.defaultPairs.length; i++) {
		const entry = ctx.defaultPairs[i]
		if (!caseCtx.branchIndices.includes(entry.originalIndex)) {
			const intersection = intersectNodesRoot(
				entry.branch._in,
				discriminantNode,
				ctx.node.$
			)
			if (
				!(intersection instanceof Disjoint) ||
				// a branch disjoint above the case may reach it through a primitive's
				// keys, e.g. a string's characters
				(intersection.some(
					disjointEntry => disjointEntry.path.length < ctx.location.path.length
				) &&
					entry.branch._in.overlaps(
						(primitiveDiscriminantNode ??= discriminantCaseToNode(
							caseCtx.condition,
							ctx.location.path,
							ctx.node.$,
							{ includesPrimitives: true }
						))
					))
			) {
				// include cases where an object not including the
				// discriminant path might have that value present as an undeclared key
				const overlapping = pruneDiscriminant(entry.branch, ctx.location)!
				resolvedEntries?.push({
					originalIndex: entry.originalIndex,
					branch: overlapping
				})
			}
			nextDefaults.push(entry)
		}
	}

	ctx.defaultPairs = nextDefaults
	return resolvedEntries
}

const viableOrderedCandidates = (
	candidates: DiscriminantCandidate[],
	originalBranches: readonly Union.ChildNode[]
): DiscriminantCandidate[] => {
	const viableCandidates = candidates.filter(candidate => {
		const caseGroups = Object.values(candidate.cases).map(
			caseCtx => caseCtx.branchIndices
		)

		// compare each group against all subsequent groups.
		for (let i = 0; i < caseGroups.length - 1; i++) {
			const currentGroup = caseGroups[i]
			for (let j = i + 1; j < caseGroups.length; j++) {
				const nextGroup = caseGroups[j]

				// for each group pair, check for branches whose order was reversed
				for (const currentIndex of currentGroup) {
					for (const nextIndex of nextGroup) {
						if (currentIndex > nextIndex) {
							if (
								originalBranches[currentIndex]._in.overlaps(
									originalBranches[nextIndex]._in
								)
							) {
								// if the order was not preserved and the branches overlap,
								// this is not a viable discriminant as it cannot guarantee the same behavior
								return false
							}
						}
					}
				}
			}
		}

		// branch groups preserved order for non-disjoint pairs and is viable
		return true
	})

	return viableCandidates
}

export const discriminantCaseToNode = (
	caseDiscriminant: CaseDiscriminant,
	path: PropertyKey[],
	$: BaseScope,
	{ includesPrimitives }: { includesPrimitives?: boolean } = {}
): BaseRoot => {
	let node: BaseRoot =
		caseDiscriminant === "undefined" ? $.node("unit", { unit: undefined })
		: caseDiscriminant === "null" ? $.node("unit", { unit: null })
		: caseDiscriminant === "boolean" ? $.units([true, false])
		: caseDiscriminant.is("domain") && caseDiscriminant.domain === "number" ?
			$.node("domain", typeofNumber)
		:	caseDiscriminant
	for (let i = path.length - 1; i >= 0; i--) {
		const key = path[i]
		const structure =
			typeof key === "number" ?
				$.node("structure", {
					sequence: $.node("sequence", {
						// create unknown for preceding elements (could be optimized with safe imports)
						prefix: [...range(key).map(_ => $.node("intersection", {})), node],
						variadic: $.node("intersection", {})
					})
				})
			:	$.node("structure", {
					required: [$.node("required", { key, value: node })]
				})
		node = $.node(
			"intersection",
			typeof key === "number" ?
				{ proto: $.node("proto", { proto: Array }), structure }
			:	{ domain: $.node("domain", { domain: "object" }), structure }
		)
		if (includesPrimitives && isReadableOnPrimitive(key)) {
			node = $.node("union", {
				branches: [
					node,
					$.node("domain", { domain: "string" }),
					$.node("domain", typeofNumber),
					$.node("domain", { domain: "bigint" }),
					$.node("domain", { domain: "symbol" }),
					$.node("unit", { unit: true }),
					$.node("unit", { unit: false })
				]
			})
		}
	}
	return node
}

// a typeof check doesn't exclude NaN or Infinity
const typeofNumber: Domain.Inner = {
	domain: "number",
	numberAllowsNaN: true,
	numberAllowsInfinity: true
}

const optionallyChainPropString = (path: PropertyKey[]): string =>
	path.reduce<string>(
		(acc, k) => acc + compileLiteralPropAccess(k, true),
		"data"
	)

export const intersectBranches = (
	l: readonly Union.ChildNode[],
	r: readonly Union.ChildNode[],
	ctx: IntersectionContext
): readonly Union.ChildNode[] | Disjoint => {
	// If the corresponding r branch is identified as a subtype of an l branch, the
	// value at rIndex is set to null so we can avoid including previous/future
	// intersections in the reduced result.
	const batchesByR: (BaseRoot[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		let candidatesByR: { [rIndex: number]: BaseRoot } = {}
		for (let rIndex = 0; rIndex < r.length; rIndex++) {
			if (batchesByR[rIndex] === null) {
				// rBranch is a subtype of an lBranch and
				// will not yield any distinct intersection
				continue
			}
			if (l[lIndex].equals(r[rIndex])) {
				// Combination of subtype and supertype cases
				batchesByR[rIndex] = null
				candidatesByR = {}
				break
			}
			const branchIntersection = intersectOrPipeNodes(l[lIndex], r[rIndex], ctx)
			if (branchIntersection instanceof Disjoint) {
				// Doesn't tell us anything useful about their relationships
				// with other branches
				continue
			}
			if (branchIntersection.equals(l[lIndex])) {
				// If the current l branch is a subtype of r, intersections
				// with previous and remaining branches of r won't lead to
				// distinct intersections.
				batchesByR[rIndex]!.push(l[lIndex])
				candidatesByR = {}
				break
			}
			if (branchIntersection.equals(r[rIndex])) {
				// If the current r branch is a subtype of l, set its batch to
				// null, removing any previous intersections and preventing any
				// of its remaining intersections from being computed.
				batchesByR[rIndex] = null
			} else {
				// If neither l nor r is a subtype of the other, add their
				// intersection as a candidate (could still be removed if it is
				// determined l or r is a subtype of a remaining branch).
				candidatesByR[rIndex] = branchIntersection
			}
		}
		for (const rIndex in candidatesByR) {
			// batchesByR at rIndex should never be null if it is in candidatesByR
			batchesByR[rIndex]![lIndex] = candidatesByR[rIndex]
		}
	}
	// Compile the reduced intersection result, including:
	// 		1. Remaining candidates resulting from distinct intersections or strict subtypes of r
	// 		2. Original r branches corresponding to indices with a null batch (subtypes of l)
	const resultBranches = batchesByR.flatMap(
		// ensure unions returned from branchable intersections like sequence are flattened
		(batch, i) => batch?.flatMap(branch => branch.branches) ?? r[i]
	)
	return resultBranches.length === 0 ?
			Disjoint.init("union", l, r)
		:	resultBranches
}

// morphs that transform alike are one morph from either input
const mergeMorphBranches = (
	branches: readonly Union.ChildNode[],
	$: BaseScope
): readonly Union.ChildNode[] => {
	if (!branches.some(branch => branch.is("morph"))) return branches
	const merged: Union.ChildNode[] = []
	for (const branch of branches) {
		if (!branch.is("morph")) {
			merged.push(branch)
			continue
		}
		const matchingIndex = merged.findIndex(
			matching => matching.is("morph") && matching.sameMorphs(branch)
		)
		if (matchingIndex === -1) {
			merged.push(branch)
			continue
		}
		const matching = merged[matchingIndex] as Morph.Node
		const mergedHead =
			matching.head && branch.head ?
				matching.head.rawOr(branch.head)
			:	matching._in.rawOr(branch._in)
		merged[matchingIndex] = $.node("morph", {
			...matching.inner,
			morphs: [mergedHead, ...matching.piped]
		})
	}
	return merged
}

const unknownUnionBranches = [
	"string",
	"number",
	"object",
	"bigint",
	"symbol",
	"true",
	"false",
	"undefined",
	"null"
] as const

let unknownUnionHashes: string[] | undefined

// a union of every domain and unit without one allows anything
const isUnknownUnion = (branches: readonly Union.ChildNode[]): boolean => {
	if (branches.length !== unknownUnionBranches.length || !$ark.kw) return false
	unknownUnionHashes ??= unknownUnionBranches
		.map(name => $ark.kw[name].hash)
		.sort()
	return branches.every((branch, i) => branch.hash === unknownUnionHashes![i])
}

export const reduceBranches = ({
	branches,
	ordered
}: Union.Inner): readonly Union.ChildNode[] => {
	if (branches.length < 2) return branches

	const uniquenessByIndex: Record<number, boolean> = branches.map(() => true)
	for (let i = 0; i < branches.length; i++) {
		for (let j = i + 1; j < branches.length && uniquenessByIndex[i]; j++) {
			if (!uniquenessByIndex[j]) continue
			if (branches[i].equals(branches[j])) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			// units that aren't equal are disjoint
			if (branches[i].is("unit") && branches[j].is("unit")) continue
			// an alias branch is reduced once the union is rebuilt from its resolution
			if (branches[i].topAlias || branches[j].topAlias) continue
			if (requireDisjointProps(branches[i]._in, branches[j]._in)) continue
			const intersection = intersectNodesRoot(
				branches[i]._in,
				branches[j]._in,
				branches[0].$
			)!
			if (intersection instanceof Disjoint) continue

			if (!ordered) assertDeterminateOverlap(branches[i], branches[j])

			if (intersection.equals(branches[i]._in)) {
				// preserve ordered branches that are a subtype of a subsequent branch
				uniquenessByIndex[i] = !!ordered
			} else if (intersection.equals(branches[j]._in))
				uniquenessByIndex[j] = false
		}
	}
	const uniqueBranches = branches.filter((_, i) => uniquenessByIndex[i])
	return ordered ? uniqueBranches : mergeAlike(uniqueBranches)
}

// objects requiring a key whose values can't meet are disjoint, without
// intersecting the rest of their structures
const requireDisjointProps = (l: BaseRoot, r: BaseRoot): boolean => {
	if (!l.is("intersection") || !r.is("intersection")) return false
	const rProps = r.structure?.byKey
	if (!rProps) return false
	for (const prop of l.structure?.required ?? []) {
		const match = rProps[prop.key]
		if (
			match?.required &&
			intersectNodesRoot(prop.value, match.value, l.$) instanceof Disjoint
		)
			return true
	}
	return false
}

// branches differing in one way union to one branch
const mergeAlike = (
	branches: readonly Union.ChildNode[]
): readonly Union.ChildNode[] => {
	const candidates = mergeCandidates(branches)
	for (let i = 0; i < branches.length; i++) {
		for (const j of candidates[i]) {
			const merged =
				mergeRangeBranches(branches[i], branches[j]) ??
				mergePropBranches(branches[i], branches[j])
			if (!merged) continue
			return reduceBranches({
				branches: branches.flatMap((branch, k) =>
					k === i ? merged
					: k === j ? []
					: branch
				)
			})
		}
	}
	return branches
}

// the later branches each could merge with: those sharing everything but a
// range or one prop, and for a unit, which could extend any range, every
// intersection
const mergeCandidates = (branches: readonly Union.ChildNode[]): number[][] => {
	const ids = new Map<unknown, number>()
	const signatureId = (hashOrKey: unknown) => {
		let id = ids.get(hashOrKey)
		if (id === undefined) ids.set(hashOrKey, (id = ids.size))
		return id
	}
	const hashIds = (nodes: readonly BaseNode[]) =>
		nodes.map(node => signatureId(node.hash)).join()
	const alike: Record<string, number[]> = {}
	const units: number[] = []
	const intersections: number[] = []
	for (const [i, branch] of branches.entries()) {
		if (branch.is("unit")) {
			if (typeof branch.unit === "number" || branch.unit instanceof Date)
				units.push(i)
			continue
		}
		if (!branch.is("intersection")) continue
		intersections.push(i)
		const signatures = rangeFamilies.map(
			(family, f) => `${f}:${hashIds(childrenExcept(branch, family.kinds))}`
		)
		const { structure } = branch
		if (structure) {
			const rest = `${hashIds(childrenExcept(branch, ["structure"]))}|${structure.undeclared}|${hashIds(structure.index ?? [])}|${structure.sequence?.hash}`
			// the other props keep their order
			const props = structure.props.map(prop => signatureId(prop.hash))
			for (const [p, prop] of structure.props.entries()) {
				signatures.push(
					`${rest}|${signatureId(prop.key)}|${props.filter((_, q) => q !== p).join()}`
				)
			}
		}
		for (const signature of signatures) (alike[signature] ??= []).push(i)
	}
	const candidates = branches.map(() => new Set<number>())
	const pair = (i: number, j: number) =>
		i < j ? candidates[i].add(j) : candidates[j].add(i)
	for (const indices of Object.values(alike)) {
		for (let a = 0; a < indices.length; a++)
			for (let b = a + 1; b < indices.length; b++) pair(indices[a], indices[b])
	}
	for (const u of units) for (const i of intersections) pair(u, i)
	return candidates.map(set => [...set].sort((l, r) => l - r))
}

// branches alike but for their range, like 0 < number < 5 and 3 <= number < 10,
// are one if their ranges connect, or meet at a value neither includes, which
// the one excludes. a unit is a range of one value
const mergeRangeBranches = (
	a: Union.ChildNode,
	b: Union.ChildNode
): Union.ChildNode | undefined => {
	const [l, r] = a.is("intersection") ? [a, b] : [b, a]
	// bounds exclude NaN and invalid Dates, which the basis allows
	if (
		!l.is("intersection") ||
		l.inner.domain?.numberAllowsNaN ||
		l.inner.proto?.dateAllowsInvalid
	)
		return
	const family = rangeFamilies.find(family =>
		family.kinds.some(
			kind => l.inner[kind] || (r.is("intersection") && r.inner[kind])
		)
	)
	if (!family) return
	const rest = childrenExcept(l, family.kinds)
	const rRange =
		r.is("intersection") ?
			nodesEqual(rest, childrenExcept(r, family.kinds)) && rangeOf(r, family)
		: (
			r.is("unit") &&
			(family.lower === "after" ?
				r.unit instanceof Date
			:	typeof r.unit === "number") &&
			rest.every(child => child.allowsUnused(r.unit as never))
		) ?
			{
				lower: { value: (r.unit as number | Date).valueOf() },
				upper: { value: (r.unit as number | Date).valueOf() },
				excluded: []
			}
		:	undefined
	const range = rRange && mergeRange(rangeOf(l, family), rRange, family)
	if (!range || !sameMeta([l, r])) return
	const bounds = [l, r].flatMap(branch =>
		branch.is("unit") ?
			[branch]
		:	branch.children.filter(child =>
				family.kinds.some(kind => kind === child.kind)
			)
	)
	if (!sameMeta(bounds)) return
	const inner: dict = { ...l.inner, meta: l.meta }
	for (const kind of family.kinds) delete inner[kind]
	return l.$.node(
		"intersection",
		Object.assign(inner, rangeInner(range, family, bounds[0].meta, l.$))
	) as Union.ChildNode
}

type RangeKind =
	| "min"
	| "max"
	| "notEqual"
	| "minLength"
	| "maxLength"
	| "exactLength"
	| "notEqualLength"
	| "after"
	| "before"

interface RangeFamily {
	lower: "min" | "minLength" | "after"
	upper: "max" | "maxLength" | "before"
	excluded: "notEqual" | "notEqualLength"
	kinds: RangeKind[]
	// lengths and Dates are integers whose bounds are inclusive
	integral: boolean
}

const rangeFamilies: RangeFamily[] = [
	{
		lower: "min",
		upper: "max",
		excluded: "notEqual",
		kinds: ["min", "max", "notEqual"],
		integral: false
	},
	{
		lower: "minLength",
		upper: "maxLength",
		excluded: "notEqualLength",
		kinds: ["minLength", "maxLength", "exactLength", "notEqualLength"],
		integral: true
	},
	{
		lower: "after",
		upper: "before",
		excluded: "notEqual",
		kinds: ["after", "before", "notEqual"],
		integral: true
	}
]

interface Limit {
	value: number
	exclusive?: true | undefined
}

// an unbounded side is undefined
interface Range {
	lower: Limit | undefined
	upper: Limit | undefined
	excluded: number[]
}

const rangeOf = (node: Intersection.Node, family: RangeFamily): Range => {
	const exact = family.integral ? node.inner.exactLength : undefined
	const limitOf = (bound: BaseRange<any> | undefined): Limit | undefined =>
		bound && { value: bound.numRule, exclusive: bound.exclusive }
	return {
		lower: exact ? { value: exact.rule } : limitOf(node.inner[family.lower]),
		upper: exact ? { value: exact.rule } : limitOf(node.inner[family.upper]),
		excluded: (node.inner[family.excluded] ?? []).map(node =>
			node.rule.valueOf()
		)
	}
}

const includes = (range: Range, value: number) =>
	(!range.lower ||
		value > range.lower.value ||
		(value === range.lower.value && !range.lower.exclusive)) &&
	(!range.upper ||
		value < range.upper.value ||
		(value === range.upper.value && !range.upper.exclusive)) &&
	!range.excluded.includes(value)

// the range including what either does, if all it adds is one value at most
const mergeRange = (
	l: Range,
	r: Range,
	family: RangeFamily
): Range | undefined => {
	// first starts no later than second
	const [first, second] =
		(
			!l.lower ||
			(r.lower &&
				(l.lower.value < r.lower.value ||
					(l.lower.value === r.lower.value && !l.lower.exclusive)))
		) ?
			[l, r]
		:	[r, l]
	const excluded: number[] = []
	if (first.upper && second.lower) {
		const distance = second.lower.value - first.upper.value
		if (
			family.integral ?
				distance === 2
			:	distance === 0 && first.upper.exclusive && second.lower.exclusive
		)
			excluded.push(first.upper.value + (family.integral ? 1 : 0))
		else if (distance > (family.integral ? 1 : 0)) return
	}
	excluded.push(
		...first.excluded.filter(value => !includes(second, value)),
		...second.excluded.filter(value => !includes(first, value))
	)
	return {
		lower: first.lower,
		upper:
			!first.upper || !second.upper ? undefined
			: first.upper.value === second.upper.value ?
				first.upper.exclusive ?
					second.upper
				:	first.upper
			: first.upper.value > second.upper.value ? first.upper
			: second.upper,
		excluded
	}
}

const rangeInner = (
	range: Range,
	family: RangeFamily,
	meta: ArkEnv.meta,
	$: BaseScope
): object => {
	const ruleOf = (value: number) =>
		family.lower === "after" ? new Date(value) : value
	const bound = (kind: RangeFamily["lower" | "upper"], limit: Limit) =>
		$.node(kind, {
			...constraintInputOf(kind, {
				rule: ruleOf(limit.value),
				exclusive: limit.exclusive
			} as never),
			meta
		})
	return {
		// no length is less than 0
		...(range.lower &&
			!(family.lower === "minLength" && range.lower.value <= 0) && {
				[family.lower]: bound(family.lower, range.lower)
			}),
		...(range.upper && { [family.upper]: bound(family.upper, range.upper) }),
		...(range.excluded.length && {
			[family.excluded]: range.excluded.map(value =>
				$.node(family.excluded, { rule: ruleOf(value), meta })
			)
		})
	}
}

// branches alike but for one key's value, like { a: string } and { a: number },
// are one whose value is either, optional if either has it optional. a default
// is kept to its own branch
const mergePropBranches = (
	l: Union.ChildNode,
	r: Union.ChildNode
): Union.ChildNode | undefined => {
	if (
		!l.is("intersection") ||
		!r.is("intersection") ||
		!l.structure ||
		!r.structure ||
		l.structure.props.length !== r.structure.props.length ||
		l.structure.undeclared !== r.structure.undeclared ||
		!nodesEqual(l.structure.index ?? [], r.structure.index ?? []) ||
		!sequencesMatch(l.structure.sequence, r.structure.sequence) ||
		!nodesEqual(
			childrenExcept(l, ["structure"]),
			childrenExcept(r, ["structure"])
		)
	)
		return
	let lProp: Prop.Node | undefined
	let rProp: Prop.Node | undefined
	for (const prop of l.structure.props) {
		const match = r.structure.byKey[prop.key]
		if (!match) return
		if (hashesMatch(prop, match)) continue
		if (lProp) return
		lProp = prop
		rProp = match
	}
	// an aliased value could reach the union it would be merged into
	if (
		!lProp ||
		!sameMeta([l, r]) ||
		!sameMeta([l.structure, r.structure]) ||
		!sameMeta([lProp, rProp!]) ||
		lProp.value.hasAlias ||
		rProp!.value.hasAlias ||
		(lProp.is("optional") && lProp.hasDef()) ||
		(rProp!.is("optional") && rProp!.hasDef())
	)
		return
	const kind = lProp.required && rProp!.required ? "required" : "optional"
	// a prop that becomes optional keeps its place
	const structure: dict = {
		...l.structure.inner,
		order: l.structure.keyOrder
	}
	structure[lProp.kind] = l.structure[lProp.kind]!.filter(
		prop => prop !== lProp
	)
	structure[kind] = [
		...((structure[kind] as Prop.Node[] | undefined) ?? []),
		l.$.node(kind, {
			key: lProp.key,
			value: lProp.value.rawOr(rProp!.value),
			meta: lProp.meta
		})
	]
	return l.$.node("intersection", {
		...l.inner,
		structure: l.$.node("structure", {
			...structure,
			meta: l.structure.meta
		} as never),
		meta: l.meta
	}) as Union.ChildNode
}

// a merge keeps a node only if its counterpart has the same meta
const nodesEqual = (l: readonly BaseNode[], r: readonly BaseNode[]) =>
	arrayEquals(l, r, { isEqual: hashesMatch })

const sequencesMatch = (
	l: Sequence.Node | undefined,
	r: Sequence.Node | undefined
) => (l && r ? hashesMatch(l, r) : l === r)

// a merge replaces nodes only if they agree on the meta their replacement keeps
const sameMeta = (nodes: readonly BaseNode[]) =>
	nodes.every(
		node => JSON.stringify(node.metaJson) === JSON.stringify(nodes[0].metaJson)
	)

const childrenExcept = (node: Intersection.Node, kinds: readonly NodeKind[]) =>
	node.children.filter(child => !kinds.includes(child.kind))

const assertDeterminateOverlap = (l: Union.ChildNode, r: Union.ChildNode) => {
	if (l.hasAlias || r.hasAlias) {
		if (!isResolutionFinal()) {
			// aliased branches' transforms and overlap are known once definitions close
			queueUnchecked(() => {
				if (
					(l.tfs || r.tfs) &&
					!l.equals(r) &&
					!(intersectNodesRoot(l._in, r._in, l.$) instanceof Disjoint)
				)
					assertDeterminateOverlap(l, r)
			}, `${l.id}|${r.id}`)
			return
		}
		if (!l.tfs && !r.tfs) return
	} else if (!l.alters && !r.alters) return

	if (
		!arrayEquals(l.topMorphs as Morph[], r.topMorphs as Morph[]) ||
		(l as Morph.Node).inverse !== (r as Morph.Node).inverse ||
		!arrayEquals(l.flatMorphs, r.flatMorphs, { isEqual: flatMorphsAreEqual }) ||
		!arrayEquals(transformingAliasRefsOf(l), transformingAliasRefsOf(r), {
			isEqual: flatRefsAreEqual
		})
	) {
		throwParseError(
			writeIndiscriminableMorphMessage(l.expression, r.expression)
		)
	}
}

const transformingAliasRefsOf = (node: BaseRoot): FlatRef[] =>
	node.flatRefs.filter(ref => ref.node.is("alias") && ref.node.tfs)

type DiscriminantCandidate<kind extends DiscriminantKind = DiscriminantKind> = {
	path: PropertyKey[]
	kind: kind
	cases: CandidateCases<kind>
}

type CandidateCases<kind extends DiscriminantKind = DiscriminantKind> = {
	[caseKey in CaseKey<kind>]: CaseContext
}

export const discriminantJsonOf = (node: Union.Node): JsonStructure | null =>
	node.discriminant && {
		kind: node.discriminant.kind,
		path: node.discriminant.path.map(k =>
			typeof k === "string" ? k : compileSerializedValue(k)
		),
		cases: flatMorph(node.discriminant.cases, (k, caseNode) => [
			k,
			caseNode === true ? caseNode
			: caseNode.is("union") && caseNode.discriminant ?
				discriminantJsonOf(caseNode)!
			:	caseNode.json
		])
	}

export const pruneDiscriminant = (
	discriminantBranch: BaseRoot,
	discriminantCtx: DiscriminantLocation
): BaseRoot | null =>
	discriminantBranch.transform(
		(nodeKind, inner) => {
			if (nodeKind === "unit") return null
			// a discriminant's typeof check doesn't exclude NaN or Infinity
			if (nodeKind === "domain") {
				const { domain, numberAllowsNaN, numberAllowsInfinity } =
					inner as Domain.Inner
				if (domain !== "number" || (numberAllowsNaN && numberAllowsInfinity))
					return null
			}
			return inner
		},
		{
			shouldTf: (node, ctx) => {
				// safe to cast here as index nodes are never discriminants
				const propString = optionallyChainPropString(ctx.path as PropertyKey[])

				if (!discriminantCtx.pathStr.startsWith(propString)) return false

				// pruning a union's branches narrows it, e.g. string | number to number
				if (node.is("union")) return false

				if (node.is("domain") && node.domain === "object")
					// if we've already checked a path at least as long as the current one,
					// we don't need to revalidate that we're in an object
					// unless a primitive has its next key
					return !isReadableOnPrimitive(discriminantCtx.path[ctx.path.length])

				if (
					(node.is("domain") ||
						discriminantCtx.kind === "unit" ||
						isDomainUnit(node)) &&
					propString === discriminantCtx.pathStr
				)
					// if the discriminant has already checked the domain at the current path
					// (or a unit literal, implying a domain, or null or undefined, which
					// their domain implies), we don't need to recheck it
					return true

				// we don't need to recurse into index nodes as they will never
				// have a required path therefore can't be used to discriminate
				return node.children.length !== 0 && node.kind !== "index"
			}
		}
	)

// a unit its domain holds nothing else of
const isDomainUnit = (node: BaseNode): boolean =>
	node.is("unit") && (node.unit === null || node.unit === undefined)

const primitivePrototypes = [
	String.prototype,
	Number.prototype,
	Boolean.prototype,
	BigInt.prototype,
	Symbol.prototype
]

// an optional chain reads a primitive's keys, e.g. a string's length
const isReadableOnPrimitive = (key: PropertyKey | undefined): boolean =>
	key !== undefined &&
	(typeof key === "number" ||
		(typeof key === "string" && integerLikeMatcher.test(key)) ||
		primitivePrototypes.some(proto => key in proto))

export const writeIndiscriminableMorphMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: ${lDescription}
Right: ${rDescription}
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`

export const writeOrderedIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
