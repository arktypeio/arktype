import {
	type ArkEnv,
	$ark,
	Disjoint,
	compileLiteralPropAccess,
	compileSerializedValue,
	constraintInputOf,
	flatMorphsAreEqual,
	flatRefsAreEqual,
	hasArkKind,
	hashesMatch,
	isNode,
	isResolutionFinal,
	queueUnchecked,
	reachesDefault,
	sameBoundUnit,
	type Alias,
	type BaseNode,
	type BaseRange,
	type BaseRoot,
	type BaseScope,
	type BoundUnit,
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
	type KeyOrKeyNode,
	type Morph,
	type NodeKind,
	type Prop,
	type Sequence,
	type Union,
	type Unit
} from "@ark/schema"
import {
	arrayEquals,
	flatMorph,
	type dict,
	integerLikeMatcher,
	isDate,
	isEmptyObject,
	range,
	stringifyPath,
	throwParseError,
	type JsonStructure,
	type Key
} from "@ark/util"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { sortSiblings } from "../constraint.ts"
import {
	boundUnitOf,
	hasCustomBoundUnit,
	intersectNodesRoot,
	intersectOrPipeNodes,
	sameBoundUnits
} from "../intersections.ts"

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
	let candidates: DiscriminantCandidate[] | undefined =
		!node.ordered && node.branches.length >= 16 ?
			fastCoveringCandidates(node.branches)
		:	undefined
	if (!candidates) {
		candidates = []
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
			const cases = Object.values(candidate.cases) as MutableCaseContext[]
			const seen = new Set<number>()
			for (const c of cases) for (const i of c.branchIndices) seen.add(i)
			for (let i = 0; i < node.branches.length; i++) {
				if (seen.has(i)) continue
				for (const [k, condition] of casesHeldAt(node.branches[i], candidate))
					addCase(candidate.cases, k, i, condition)
			}
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

		const alreadyReduced =
			!node.ordered &&
			!ctx.defaultPairs.length &&
			branches.length > 1 &&
			allSameAtPath(
				node.branches,
				ctx.best.cases[k].branchIndices,
				ctx.location.path
			)

		const caseNode =
			branches.length === 1 ?
				branches[0]
			:	node.$.node(
					"union",
					unionInner(branches, node.ordered),
					alreadyReduced ? { reduced: true } : undefined
				)

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

	return Object.assign(
		ctx.location,
		{ cases },
		members && { members },
		ctx.ownEnumerableDefault &&
			cases.default &&
			cases.default !== true && { ownEnumerableDefault: true as const }
	)
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

type MutableCaseContext = CaseContext & {
	seen?: Set<number>
}

const addCase = (
	cases: CandidateCases,
	k: string,
	branchIndex: number,
	condition: unknown
) => {
	const existing = cases[k] as MutableCaseContext | undefined
	if (existing) {
		const indices = existing.branchIndices as number[]
		if (existing.seen) {
			if (!existing.seen.has(branchIndex)) {
				existing.seen.add(branchIndex)
				indices.push(branchIndex)
			}
		} else if (!indices.includes(branchIndex)) {
			indices.push(branchIndex)
			if (indices.length >= 8) existing.seen = new Set(indices)
		}
	} else
		cases[k] = { branchIndices: [branchIndex], condition: condition as never }
}

const isOrdinaryProto = (node: BaseNode): boolean =>
	node.is("proto") &&
	!!node.builtinName &&
	node.proto[Symbol.hasInstance] === ordinaryHasInstance

const isObjectIntersection = (node: BaseRoot): node is Intersection.Node =>
	node.is("intersection") &&
	!node.hasAlias &&
	(node.basis === null ?
		node.structure !== undefined
	:	(node.basis.is("domain") && node.basis.domain === "object") ||
		isOrdinaryProto(node.basis))

// if every branch in a case shares the exact same required prop at a depth-1
// discriminant key and has no default-branch overlap, pruning that identical
// constraint from an already-reduced union cannot create new equalities,
// subtypes, or mergeable pairs
const allSameAtPath = (
	branches: readonly Union.ChildNode[],
	branchIndices: readonly number[],
	path: readonly PropertyKey[]
): boolean => {
	if (path.length !== 1 || typeof path[0] === "number") return false
	const key = path[0]
	const first = branches[branchIndices[0]]
	if (!isObjectIntersection(first)) return false
	const firstProp = first.structure?.byKey[key]
	if (!firstProp?.required) return false
	const targetHash = firstProp.hash
	for (let i = 1; i < branchIndices.length; i++) {
		const b = branches[branchIndices[i]]
		if (!isObjectIntersection(b)) return false
		const prop = b.structure?.byKey[key]
		if (!prop?.required || prop.hash !== targetHash) return false
	}
	return true
}

const strictDomainCaseOf = (
	node: BaseRoot,
	hasPath: boolean
): [k: string, condition: unknown] | undefined => {
	if (node.hasAlias) return
	const values = node.is("union") ? node.branches : [node]
	let domain: Domain | undefined
	for (const v of values) {
		if (v.is("proto") && !isOrdinaryProto(v)) return
		if (
			v.is("intersection") &&
			v.basis?.is("proto") &&
			!isOrdinaryProto(v.basis)
		)
			return
		const d = domainCaseOf(v)
		if (!d || (hasPath && d === "undefined")) return
		if (domain === undefined) domain = d
		else if (domain !== d) return
	}
	if (!domain) return
	return [
		`"${domain}"`,
		node.is("domain") ? node
		: domain === "undefined" || domain === "null" || domain === "boolean" ?
			domain
		:	$ark.kw[domain]
	]
}

// O(B * K) discovery of covering depth-0 or depth-1 discriminants for large
// unordered unions, returning the exact same top-ranked candidates as the
// pairwise Disjoint scan without O(B^2) intersections
const fastCoveringCandidates = (
	branches: readonly Union.ChildNode[]
): DiscriminantCandidate[] | undefined => {
	let allObject = true
	let domainCovering = true
	const depth0Domains: CandidateCases = {}
	for (let i = 0; i < branches.length; i++) {
		const input = branches[i]._in
		if (
			allObject &&
			(!isObjectIntersection(input) || !input.structure?.required?.length)
		)
			allObject = false
		if (domainCovering) {
			const domCase = strictDomainCaseOf(input, false)
			if (domCase) {
				const [k, cond] = domCase
				const existing = depth0Domains[k]
				if (existing) (existing.branchIndices as number[]).push(i)
				else depth0Domains[k] = { branchIndices: [i], condition: cond as never }
			} else domainCovering = false
		}
	}
	if (domainCovering && Object.keys(depth0Domains).length >= 2)
		return [{ kind: "domain", path: [], cases: depth0Domains }]
	if (!allObject) return

	const firstRequired = (branches[0]._in as Intersection.Node).structure!
		.required!
	const candidates: DiscriminantCandidate[] = []
	for (const reqProp of firstRequired) {
		const key = reqProp.key
		let unitCovering = true
		let domainCoveringAtKey = true
		let hasMultiUnit = false
		const unitCases: CandidateCases = {}
		const domainCases: CandidateCases = {}
		let allRequired = true
		for (let i = 0; i < branches.length; i++) {
			const prop = (branches[i]._in as Intersection.Node).structure!.byKey[key]
			if (!prop?.required || prop.value.hasAlias) {
				allRequired = false
				break
			}
			const value = prop.value
			if (unitCovering) {
				const values = value.is("union") ? value.branches : [value]
				if (
					values.length > 0 &&
					values.every(
						(v): v is Unit.Node =>
							v.is("unit") && isCaseUnit(v) && !isUndefinedCase(v.jsUnit)
					)
				) {
					if (values.length > 1) hasMultiUnit = true
					for (const v of values) addCase(unitCases, v.jsUnit, i, v)
				} else unitCovering = false
			}
			if (domainCoveringAtKey) {
				const domCase = strictDomainCaseOf(value, true)
				if (domCase) {
					const [k, cond] = domCase
					const existing = domainCases[k]
					if (existing) (existing.branchIndices as number[]).push(i)
					else domainCases[k] = { branchIndices: [i], condition: cond as never }
				} else domainCoveringAtKey = false
			}
			if (!unitCovering && !domainCoveringAtKey) break
		}
		if (!allRequired) continue
		if (unitCovering) {
			const unitKeys = Object.keys(unitCases)
			if (unitKeys.length >= 2) {
				if (!hasMultiUnit) {
					candidates.push({ kind: "unit", path: [key], cases: unitCases })
					continue
				}
				// verify at least one pair of branches is disjoint at this key,
				// pivoting on the branch with the fewest units so a superset union
				// in branches[0] does not hide a clean discriminant
				let pivotIndex = 0
				let pivotSize = Number.POSITIVE_INFINITY
				for (let i = 0; i < branches.length; i++) {
					const val = (branches[i]._in as Intersection.Node).structure!.byKey[
						key
					]!.value
					const size = val.is("union") ? val.branches.length : 1
					if (size < pivotSize) {
						pivotSize = size
						pivotIndex = i
						if (size === 1) break
					}
				}
				const pivotVal = (branches[pivotIndex]._in as Intersection.Node)
					.structure!.byKey[key]!.value
				const pivotUnits = new Set(
					(pivotVal.is("union") ? pivotVal.branches : [pivotVal]).map(
						v => (v as Unit.Node).jsUnit
					)
				)
				let hasDisjointPair = false
				for (let i = 0; i < branches.length; i++) {
					if (i === pivotIndex) continue
					const val = (branches[i]._in as Intersection.Node).structure!.byKey[
						key
					]!.value
					const vs = val.is("union") ? val.branches : [val]
					if (vs.every(v => !pivotUnits.has((v as Unit.Node).jsUnit))) {
						hasDisjointPair = true
						break
					}
				}
				if (hasDisjointPair) {
					candidates.push({ kind: "unit", path: [key], cases: unitCases })
					continue
				}
			}
		}
		if (domainCoveringAtKey && Object.keys(domainCases).length >= 2)
			candidates.push({ kind: "domain", path: [key], cases: domainCases })
	}
	return candidates.length ? candidates : undefined
}

// whether a branch's input is strictly restricted to its own case(s) at
// candidate.path via required object props (not index signatures, aliases, or
// custom Symbol.hasInstance protos), so it can never overlap any other case
const isStrictlyCoveredAt = (
	branch: BaseRoot,
	candidate: DiscriminantCandidate
): boolean => {
	let value = branch._in
	for (const k of candidate.path) {
		if (typeof k === "number" || !isObjectIntersection(value)) return false
		const prop = value.structure?.byKey[k]
		if (!prop?.required) return false
		value = prop.value
	}
	if (value.hasAlias) return false
	if (candidate.kind === "unit") {
		const values = value.is("union") ? value.branches : [value]
		return (
			values.length > 0 &&
			values.every(
				v =>
					v.is("unit") &&
					isCaseUnit(v) &&
					!(candidate.path.length && isUndefinedCase(v.jsUnit))
			)
		)
	}
	return strictDomainCaseOf(value, candidate.path.length > 0) !== undefined
}

type CaseResolutionContext = {
	best: DiscriminantCandidate
	location: DiscriminantLocation
	defaultPairs: BranchEntry[]
	node: Union.Node
	ownEnumerableDefault?: true
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

	const covered = new Set<number>()
	for (const { branchIndices } of Object.values(best.cases))
		for (const i of branchIndices) covered.add(i)

	const defaultPairs: BranchEntry[] = []
	for (
		let originalIndex = 0;
		originalIndex < node.branches.length;
		originalIndex++
	) {
		const branch = node.branches[originalIndex]
		if (covered.has(originalIndex) && isStrictlyCoveredAt(branch, best))
			continue
		defaultPairs.push({ originalIndex, branch })
	}

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
	const caseCtx = ctx.best.cases[key] as MutableCaseContext
	let resolvedEntries: BranchEntry[] | null = []

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

	if (ctx.defaultPairs.length) {
		const discriminantNode = discriminantCaseToNode(
			caseCtx.condition,
			ctx.location.path,
			ctx.node.$
		)
		let primitiveDiscriminantNode: BaseRoot | undefined
		const nextDefaults: BranchEntry[] = []
		const branchSet =
			caseCtx.seen ??
			(caseCtx.branchIndices.length >= 8 ?
				new Set(caseCtx.branchIndices)
			:	undefined)

		for (let i = 0; i < ctx.defaultPairs.length; i++) {
			const entry = ctx.defaultPairs[i]
			const inCase =
				branchSet ?
					branchSet.has(entry.originalIndex)
				:	caseCtx.branchIndices.includes(entry.originalIndex)
			if (!inCase) {
				const intersection = intersectNodesRoot(
					entry.branch._in,
					discriminantNode,
					ctx.node.$
				)
				if (
					!(intersection instanceof Disjoint) ||
					disjointLeavesKeyOverlap(entry.branch._in, intersection) ||
					// a branch disjoint above the case may reach it through a primitive's
					// keys, e.g. a string's characters
					(intersection.some(
						disjointEntry =>
							disjointEntry.path.length < ctx.location.path.length
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
					const overlapping = pruneDiscriminant(entry.branch, ctx.location)
					if (overlapping === null) resolvedEntries = null
					else {
						resolvedEntries?.push({
							originalIndex: entry.originalIndex,
							branch: overlapping
						})
					}
				} else if (
					disjointUsesOwnEnumerableCheck(entry.branch._in, intersection)
				)
					ctx.ownEnumerableDefault = true
				nextDefaults.push(entry)
			}
		}

		ctx.defaultPairs = nextDefaults
	}

	// branches alike only at the case's value aren't alike once pruned of it;
	// keep them as the union has them so reducing the case stays determinate
	if (
		resolvedEntries &&
		!ctx.node.ordered &&
		resolvedEntries.some(entry => entry.branch.tfs) &&
		!staysDeterminate(resolvedEntries)
	) {
		resolvedEntries = resolvedEntries.map(({ originalIndex }) => ({
			originalIndex,
			branch: ctx.node.branches[originalIndex]
		}))
	}

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
		// the case is of any data holding the value there, so its keys are
		// open whatever $ configures for undeclared ones
		const structure =
			typeof key === "number" ?
				$.node("structure", {
					undeclared: "ignore",
					sequence: $.node("sequence", {
						// create unknown for preceding elements (could be optimized with safe imports)
						prefix: [...range(key).map(_ => $.node("intersection", {})), node],
						variadic: $.node("intersection", {})
					})
				})
			:	$.node("structure", {
					undeclared: "ignore",
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
			if (l[lIndex].equals(r[rIndex]) && sameBoundUnits(l[lIndex], r[rIndex])) {
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
				batchesByR[rIndex]!.push(
					sameBoundUnits(branchIntersection, l[lIndex]) ?
						l[lIndex]
					:	branchIntersection
				)
				candidatesByR = {}
				break
			}
			if (
				branchIntersection.equals(r[rIndex]) &&
				sameBoundUnits(branchIntersection, r[rIndex])
			) {
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

const domainBits: Record<Domain, number> = {
	undefined: 1,
	null: 2,
	boolean: 4,
	number: 8,
	string: 16,
	bigint: 32,
	symbol: 64,
	object: 128
}

// a unit's own bit above its domain's
export const unitBitsOf = (domain: Domain): number => domainBits[domain] * 257

const anyUnit = 255 * 256

const anyDomain = 255 + anyUnit

const ordinaryHasInstance = Function.prototype[Symbol.hasInstance]

// what an input it allows could be, read without writing that input. A proto tests
// a unit with `instanceof`, which a class's `Symbol.hasInstance` can answer for any
// domain, though a domain it never tests is disjoint from all but objects
export const domainsOf = (node: BaseRoot): number => {
	if (node.is("unit")) return unitBitsOf(node.domain)
	if (node.is("domain")) return domainBits[node.domain]
	if (node.is("proto")) {
		return (
				node.builtinName &&
					node.proto[Symbol.hasInstance] === ordinaryHasInstance
			) ?
				domainBits.object
			:	domainBits.object | anyUnit
	}
	if (node.is("intersection"))
		return node.basis ? domainsOf(node.basis) : anyDomain
	if (node.is("morph"))
		return node.head && !node.declaredIn ? domainsOf(node.head) : anyDomain
	if (node.is("union")) {
		let domains = 0
		for (const branch of node.branches) domains |= domainsOf(branch)
		return domains
	}
	return anyDomain
}

const hasNoMeta = (meta: object): boolean =>
	isEmptyObject(meta) && Object.getOwnPropertySymbols(meta).length === 0

const isBareUnit = (branch: Union.ChildNode): boolean =>
	branch.is("unit") && hasNoMeta(branch.meta)

const pureDomainBitOf = (mask: number): number => {
	const base = mask & 255
	return (
			base !== 0 && (base & (base - 1)) === 0 && (mask & ~(base * 257)) === 0
		) ?
			base
		:	0
}

export const reduceBranches = ({
	branches,
	ordered
}: Union.Inner): readonly Union.ChildNode[] => {
	if (branches.length < 2) return branches

	// sorted, equal units are adjacent, and units that aren't equal are disjoint
	if (!ordered && branches.every(isBareUnit))
		return branches.filter((branch, i) => !i || !branch.equals(branches[i - 1]))

	const uniquenessByIndex: Record<number, boolean> = branches.map(() => true)
	// branches sharing no domain are disjoint, most of a union's pairs
	const domains = branches.map(domainsOf)

	const checkPair = (i: number, j: number): void => {
		if (!uniquenessByIndex[j] || !(domains[i] & domains[j])) return
		// its props hold the same inputs, except where reading an alias could throw,
		// so that's left for after what would first read one
		const readsInputs =
			branches[i].is("intersection") &&
			branches[j].is("intersection") &&
			!branches[i].hasAlias &&
			!branches[j].hasAlias
		if (readsInputs && requireDisjointProps(branches[i], branches[j], inputOf))
			return
		if (branches[i].equals(branches[j])) {
			// if one copy has meta and the other does not, keep the undescribed copy;
			// otherwise prefer a copy carrying a custom bound unit
			if (
				!ordered &&
				((!hasNoMeta(branches[i].meta) && hasNoMeta(branches[j].meta)) ||
					(hasNoMeta(branches[i].meta) === hasNoMeta(branches[j].meta) &&
						!hasCustomBoundUnit(branches[i]) &&
						hasCustomBoundUnit(branches[j])))
			) {
				uniquenessByIndex[i] = false
				return
			}
			// if the two branches are equal, only one is marked as
			// redundant so at least one copy could still be included in
			// the final set of branches.
			uniquenessByIndex[j] = false
			return
		}
		// units that aren't equal are disjoint
		if (branches[i].is("unit") && branches[j].is("unit")) return
		// an alias branch is reduced once the union is rebuilt from its resolution
		if (branches[i].topAlias || branches[j].topAlias) return
		if (
			!readsInputs &&
			requireDisjointProps(branches[i]._in, branches[j]._in, valueOf)
		)
			return
		const intersection = intersectNodesRoot(
			branches[i]._in,
			branches[j]._in,
			branches[0].$
		)!
		if (intersection instanceof Disjoint) return

		const joined =
			!ordered && assertDeterminateOverlap(branches[i], branches[j])

		// a joined branch whose input is a subtype of another's keeps keys the
		// other deletes, unless that one deletes none
		if (intersection.equals(branches[i]._in)) {
			// of two with the same input, the one deleting none is kept
			if (joined && !branches[i].alters && intersection.equals(branches[j]._in))
				uniquenessByIndex[j] = false
			// preserve ordered branches that are a subtype of a subsequent branch
			else uniquenessByIndex[i] = !!ordered || (joined && branches[j].alters)
		} else if (intersection.equals(branches[j]._in))
			uniquenessByIndex[j] = joined && branches[i].alters
	}

	const reducePairwise = (indices: readonly number[]): void => {
		for (let a = 0; a < indices.length; a++) {
			const i = indices[a]
			if (!uniquenessByIndex[i]) continue
			for (let b = a + 1; b < indices.length && uniquenessByIndex[i]; b++)
				checkPair(i, indices[b])
		}
	}

	const reduceObjectSubset = (
		indices: number[],
		splitKeys: ReadonlySet<Key>,
		depth: number
	): void => {
		if (indices.length < 16 || depth >= 32) {
			reducePairwise(indices)
			return
		}
		const firstReq = (branches[indices[0]] as Intersection.Node).structure!
			.required!
		for (let r = 0; r < firstReq.length; r++) {
			const key = firstReq[r].key
			if (splitKeys.has(key)) continue
			let allRequired = true
			let allUnits = true
			let allPureDomain = true
			for (let k = 0; k < indices.length; k++) {
				const prop = (branches[indices[k]] as Intersection.Node).structure!
					.byKey[key]
				if (!prop?.required) {
					allRequired = false
					break
				}
				if (allUnits && !prop.value.is("unit")) allUnits = false
				if (allPureDomain && !pureDomainBitOf(domainsOf(prop.value)))
					allPureDomain = false
				if (!allUnits && !allPureDomain) break
			}
			if (!allRequired) continue
			if (allUnits) {
				const buckets = new Map<unknown, number[]>()
				for (let k = 0; k < indices.length; k++) {
					const idx = indices[k]
					const unitKey = (
						(branches[idx] as Intersection.Node).structure!.byKey[key]!
							.value as Unit.Node
					).unitJson
					const bucket = buckets.get(unitKey)
					if (bucket) bucket.push(idx)
					else buckets.set(unitKey, [idx])
				}
				if (buckets.size > 1) {
					const nextSplitKeys = new Set(splitKeys)
					nextSplitKeys.add(key)
					for (const bucket of buckets.values()) {
						if (bucket.length > 1)
							reduceObjectSubset(bucket, nextSplitKeys, depth + 1)
					}

					return
				}
			} else if (allPureDomain) {
				const buckets = new Map<number, number[]>()
				for (let k = 0; k < indices.length; k++) {
					const idx = indices[k]
					const domBit = pureDomainBitOf(
						domainsOf(
							(branches[idx] as Intersection.Node).structure!.byKey[key]!.value
						)
					)
					const bucket = buckets.get(domBit)
					if (bucket) bucket.push(idx)
					else buckets.set(domBit, [idx])
				}
				if (buckets.size > 1) {
					const nextSplitKeys = new Set(splitKeys)
					nextSplitKeys.add(key)
					for (const bucket of buckets.values()) {
						if (bucket.length > 1)
							reduceObjectSubset(bucket, nextSplitKeys, depth + 1)
					}

					return
				}
			}
		}
		reducePairwise(indices)
	}

	let partitioned = false
	if (branches.length >= 16) {
		if (
			branches.every(
				b =>
					b.is("intersection") && !b.hasAlias && !!b.structure?.required?.length
			)
		) {
			partitioned = true
			reduceObjectSubset(
				branches.map((_, i) => i),
				new Set(),
				0
			)
		} else {
			const byDomain = new Map<number, number[]>()
			let allPure = true
			for (let i = 0; i < branches.length; i++) {
				const bit = pureDomainBitOf(domains[i])
				if (!bit) {
					allPure = false
					break
				}
				const bucket = byDomain.get(bit)
				if (bucket) bucket.push(i)
				else byDomain.set(bit, [i])
			}
			if (allPure) {
				partitioned = true
				for (const [domBit, bucket] of byDomain) {
					if (bucket.length < 2) continue
					if (
						domBit === domainBits.object &&
						bucket.length >= 16 &&
						bucket.every(
							i =>
								branches[i].is("intersection") &&
								!branches[i].hasAlias &&
								!!branches[i].structure?.required?.length
						)
					)
						reduceObjectSubset(bucket, new Set(), 0)
					else reducePairwise(bucket)
				}
			}
		}
	}

	if (!partitioned) {
		for (let i = 0; i < branches.length; i++) {
			for (let j = i + 1; j < branches.length && uniquenessByIndex[i]; j++)
				checkPair(i, j)
		}
	}

	const uniqueBranches = branches.filter((_, i) => uniquenessByIndex[i])
	return ordered ? uniqueBranches : mergeAlike(uniqueBranches)
}

const inputOf = (prop: Prop.Node): BaseRoot => prop.value._in

const valueOf = (prop: Prop.Node): BaseRoot => prop.value

// objects requiring a key whose inputs can't meet are disjoint, without
// intersecting the rest of their structures or reading their inputs
const requireDisjointProps = (
	l: BaseRoot,
	r: BaseRoot,
	inputAt: (prop: Prop.Node) => BaseRoot
): boolean => {
	if (!l.is("intersection") || !r.is("intersection")) return false
	const rProps = r.structure?.byKey
	if (!rProps) return false
	const required = l.structure?.required ?? []
	// values telling branches apart are mostly units, decided without their inputs
	// up to the first pair whose intersection could call a predicate or `instanceof`
	for (const prop of required) {
		const match = rProps[prop.key]
		if (!match?.required || prop.value === match.value) continue
		if (
			!(domainsOf(prop.value) & domainsOf(match.value)) ||
			(prop.value.is("unit") &&
				match.value.is("unit") &&
				prop.value.unitJson !== match.value.unitJson)
		)
			return true
		break
	}
	for (const prop of required) {
		const match = rProps[prop.key]
		if (
			match?.required &&
			intersectNodesRoot(inputAt(prop), inputAt(match), l.$) instanceof Disjoint
		)
			return true
	}
	return false
}

// branches differing in one way union to one branch
const mergeAlike = (
	branches: readonly Union.ChildNode[]
): readonly Union.ChildNode[] => {
	// only an intersection merges, with another or a unit extending its range
	let intersections = 0
	let units = 0
	for (const branch of branches) {
		if (branch.is("intersection")) intersections++
		else if (
			branch.is("unit") &&
			(typeof branch.unit === "number" || branch.unit instanceof Date)
		)
			units++
	}
	if (!intersections || intersections + units < 2) return branches
	const { rangeCandidates, propGroups } = mergeCandidates(branches)
	for (let i = 0; i < branches.length; i++) {
		for (const j of rangeCandidates[i]) {
			const merged = mergeRangeBranches(branches[i], branches[j])
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
	for (const { key, indices } of propGroups) {
		const merged = mergePropGroup(branches, indices, key)
		if (merged) return reduceBranches({ branches: merged })
	}
	return branches
}

type PropMergeGroup = {
	key: Key
	indices: number[]
}

// the later branches each could merge with: those sharing everything but a
// range or one prop, and for a unit, which could extend any range, every
// intersection
const mergeCandidates = (
	branches: readonly Union.ChildNode[]
): { rangeCandidates: number[][]; propGroups: PropMergeGroup[] } => {
	const ids = new Map<unknown, number>()
	const signatureId = (hashOrKey: unknown) => {
		let id = ids.get(hashOrKey)
		if (id === undefined) ids.set(hashOrKey, (id = ids.size))
		return id
	}
	const hashIds = (nodes: readonly BaseNode[]) =>
		nodes.map(node => signatureId(node.hash)).join()
	const units: number[] = []
	const intersections: number[] = []
	for (const [i, branch] of branches.entries()) {
		if (branch.is("intersection")) intersections.push(i)
		else if (
			branch.is("unit") &&
			(typeof branch.unit === "number" || branch.unit instanceof Date)
		)
			units.push(i)
	}
	const rangeAlike: Record<string, number[]> = {}
	// a range merges with a branch sharing everything else, even with no range of its own
	for (const [f, family] of rangeFamilies.entries()) {
		if (
			!intersections.some(i =>
				family.kinds.some(
					kind => (branches[i] as Intersection.Node).inner[kind]
				)
			)
		)
			continue
		for (const i of intersections) {
			const branch = branches[i] as Intersection.Node
			;(rangeAlike[`${f}:${hashIds(childrenExcept(branch, family.kinds))}`] ??=
				[]).push(i)
		}
	}
	// props merge only between structures with the same keys, so most never hash
	const byKeys: Record<string, number[]> = {}
	for (const i of intersections) {
		const { structure } = branches[i] as Intersection.Node
		if (!structure) continue
		const keys = structure.props.map(prop => signatureId(prop.key))
		;(byKeys[keys.sort((l, r) => l - r).join()] ??= []).push(i)
	}
	const propGroupsBySig = new Map<string, PropMergeGroup>()
	for (const alikeKeys in byKeys) {
		if (byKeys[alikeKeys].length < 2) continue
		for (const i of byKeys[alikeKeys]) {
			const branch = branches[i] as Intersection.Node
			const structure = branch.structure!
			const rest = `${hashIds(childrenExcept(branch, ["structure"]))}|${structure.undeclared}|${hashIds(structure.index ?? [])}|${structure.sequence?.hash}`
			// the other props keep their order
			const propNodes = structure.props
			const propCount = propNodes.length
			const propIds = propNodes.map(prop => signatureId(prop.hash))
			const prefix: string[] = new Array(propCount)
			const suffix: string[] = new Array(propCount)
			prefix[0] = ""
			for (let p = 1; p < propCount; p++) {
				prefix[p] =
					p === 1 ? `${propIds[0]}` : `${prefix[p - 1]},${propIds[p - 1]}`
			}
			suffix[propCount - 1] = ""
			for (let p = propCount - 2; p >= 0; p--) {
				suffix[p] =
					p === propCount - 2 ?
						`${propIds[propCount - 1]}`
					:	`${propIds[p + 1]},${suffix[p + 1]}`
			}
			for (let p = 0; p < propCount; p++) {
				const prop = propNodes[p]
				const others =
					!prefix[p] ? suffix[p]
					: !suffix[p] ? prefix[p]
					: `${prefix[p]},${suffix[p]}`
				const sig = `${rest}|${signatureId(prop.key)}|${others}`
				const group = propGroupsBySig.get(sig)
				if (group) group.indices.push(i)
				else propGroupsBySig.set(sig, { key: prop.key, indices: [i] })
			}
		}
	}
	const candidates = branches.map(() => new Set<number>())
	const pair = (i: number, j: number) =>
		i < j ? candidates[i].add(j) : candidates[j].add(i)
	for (const indices of Object.values(rangeAlike)) {
		for (let a = 0; a < indices.length; a++)
			for (let b = a + 1; b < indices.length; b++) pair(indices[a], indices[b])
	}
	for (const u of units) for (const i of intersections) pair(u, i)
	const propGroups: PropMergeGroup[] = []
	for (const group of propGroupsBySig.values())
		if (group.indices.length >= 2) propGroups.push(group)
	return {
		rangeCandidates: candidates.map(set => [...set].sort((l, r) => l - r)),
		propGroups
	}
}

// merge all branches in a prop-alike group that share exact structure/meta
// except at `propKey` in a single O(G) pass rather than O(G^2) pairwise steps
const mergePropGroup = (
	branches: readonly Union.ChildNode[],
	indices: readonly number[],
	propKey: Key
): Union.ChildNode[] | undefined => {
	const byMeta = new Map<string, number[]>()
	for (const idx of indices) {
		const branch = branches[idx] as Intersection.Node
		const structure = branch.structure!
		const prop = structure.byKey[propKey]
		if (
			!prop ||
			prop.value.hasAlias ||
			(prop.value.is("union") && prop.value.ordered) ||
			(prop.is("optional") && prop.hasDef())
		)
			continue
		const metaKey = `${JSON.stringify(branch.metaJson)}\0${JSON.stringify(structure.metaJson)}\0${JSON.stringify(prop.metaJson)}`
		const bucket = byMeta.get(metaKey)
		if (bucket) bucket.push(idx)
		else byMeta.set(metaKey, [idx])
	}
	for (const bucket of byMeta.values()) {
		if (bucket.length < 2) continue
		const leadIdx = bucket[0]
		const lead = branches[leadIdx] as Intersection.Node
		const leadStruct = lead.structure!
		const leadProp = leadStruct.byKey[propKey]!
		const leadRest = childrenExcept(lead, ["structure"])
		const matchedIndices: number[] = []
		const matchedProps: Prop.Node[] = [leadProp]
		for (let b = 1; b < bucket.length; b++) {
			const idx = bucket[b]
			const r = branches[idx] as Intersection.Node
			const rStruct = r.structure!
			if (
				leadStruct.props.length !== rStruct.props.length ||
				leadStruct.undeclared !== rStruct.undeclared ||
				!sameSymbolMeta(lead.meta, r.meta) ||
				!sameSymbolMeta(leadStruct.meta, rStruct.meta) ||
				!nodesEqual(leadStruct.index ?? [], rStruct.index ?? []) ||
				!sequencesMatch(leadStruct.sequence, rStruct.sequence) ||
				!nodesEqual(leadRest, childrenExcept(r, ["structure"]))
			)
				continue
			let otherPropsMatch = true
			for (const prop of leadStruct.props) {
				if (prop.key === propKey) continue
				const match = rStruct.byKey[prop.key]
				if (
					!match ||
					!hashesMatch(prop, match) ||
					!sameSymbolMeta(prop.meta, match.meta) ||
					!sameBoundUnits(prop, match)
				) {
					otherPropsMatch = false
					break
				}
			}
			if (!otherPropsMatch) continue
			const rProp = rStruct.byKey[propKey]!
			if (
				!sameSymbolMeta(leadProp.meta, rProp.meta) ||
				(hashesMatch(leadProp, rProp) && sameBoundUnits(leadProp, rProp))
			)
				continue
			matchedIndices.push(idx)
			matchedProps.push(rProp)
		}
		if (!matchedIndices.length) continue
		const kind = matchedProps.every(p => p.required) ? "required" : "optional"
		const structure: dict = {
			...leadStruct.inner,
			order: leadStruct.keyOrder
		}
		structure[leadProp.kind] = leadStruct[leadProp.kind]!.filter(
			prop => prop !== leadProp
		)
		const mergedValue = lead.$.node("union", {
			branches: matchedProps.flatMap(p => p.value.branches)
		})
		structure[kind] = [
			...((structure[kind] as Prop.Node[] | undefined) ?? []),
			lead.$.node(kind, {
				key: leadProp.key,
				value: mergedValue,
				meta: leadProp.meta
			})
		]
		const merged = lead.$.node("intersection", {
			...lead.inner,
			structure: lead.$.node("structure", {
				...structure,
				meta: leadStruct.meta
			} as never),
			meta: lead.meta
		}) as Union.ChildNode
		const dropped = new Set(matchedIndices)
		return branches.flatMap((branch, k) =>
			k === leadIdx ? merged
			: dropped.has(k) ? []
			: branch
		)
	}
	return undefined
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
	const family = rangeFamilies.find(
		family =>
			rangeFamilyMatchesNode(family, l) &&
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
	const rangeBounds = bounds.filter(bound => !bound.is("unit"))
	const unit =
		family.lower === "after" ? undefined : boundUnitOf(rangeBounds[0])
	if (
		family.lower !== "after" &&
		!rangeBounds.every(bound => sameBoundUnit(boundUnitOf(bound), unit))
	)
		return
	const inner: dict = { ...l.inner, meta: l.meta }
	for (const kind of family.kinds) delete inner[kind]
	return l.$.node(
		"intersection",
		Object.assign(inner, rangeInner(range, family, bounds[0].meta, unit, l.$))
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

const rangeFamilyMatchesNode = (
	family: RangeFamily,
	node: Intersection.Node
): boolean =>
	family.lower === "after" ? node.inner.proto?.proto === Date
	: family.lower === "min" ? node.inner.domain?.domain === "number"
	: true

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
	const rangeLimitOf = (bound: BaseRange<any> | undefined): Limit | undefined =>
		bound && { value: bound.numRule, exclusive: bound.exclusive }
	return {
		lower:
			exact ? { value: exact.rule } : rangeLimitOf(node.inner[family.lower]),
		upper:
			exact ? { value: exact.rule } : rangeLimitOf(node.inner[family.upper]),
		excluded: (node.inner[family.excluded] ?? []).map(node =>
			node.rule.valueOf()
		)
	}
}

const rangeIncludes = (range: Range, value: number) =>
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
		...first.excluded.filter(value => !rangeIncludes(second, value)),
		...second.excluded.filter(value => !rangeIncludes(first, value))
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
	unit: BoundUnit | undefined,
	$: BaseScope
): object => {
	const ruleOf = (value: number) =>
		family.lower === "after" ? new Date(value) : value
	const bound = (kind: RangeFamily["lower" | "upper"], limit: Limit) =>
		$.node(kind, {
			...constraintInputOf(kind, {
				rule: ruleOf(limit.value),
				exclusive: limit.exclusive,
				...(unit ? { unit } : {})
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
				$.node(family.excluded, {
					rule: ruleOf(value),
					...(unit ? { unit } : {}),
					meta
				})
			)
		})
	}
}

export const extractRoot = (l: BaseRoot, r: BaseRoot): BaseRoot =>
	partitionRoot(l, r, { remaining: maxPartitionSplits })[0]

export const excludeRoot = (l: BaseRoot, r: BaseRoot): BaseRoot =>
	partitionRoot(l, r, { remaining: maxPartitionSplits })[1]

const maxPartitionSplits = 64
const maxDateMs = 8_640_000_000_000_000

type PartitionBudget = {
	remaining: number
}

type PartitionResult = {
	extracted: Union.ChildNode[]
	excluded: Union.ChildNode[]
}

const partitionRoot = (
	l: BaseRoot,
	r: BaseRoot,
	budget: PartitionBudget
): [extracted: BaseRoot, excluded: BaseRoot] => {
	const extracted: Union.ChildNode[] = []
	const excluded: Union.ChildNode[] = []
	for (const branch of l.branches) {
		const res = partitionBranch(branch, r, budget)
		extracted.push(...res.extracted)
		excluded.push(...res.excluded)
	}
	return [l.$.schema(extracted) as BaseRoot, l.$.schema(excluded) as BaseRoot]
}

const partitionBranch = (
	branch: Union.ChildNode,
	rNode: BaseRoot,
	budget: PartitionBudget
): PartitionResult => {
	if (branch.extends(rNode)) return { extracted: [branch], excluded: [] }
	if (budget.remaining <= 0 || !branch.overlaps(rNode))
		return { extracted: [], excluded: [branch] }
	if (branch.is("morph")) {
		return (
			splitMorphBranch(branch, rNode, budget) ?? {
				extracted: [],
				excluded: [branch]
			}
		)
	}
	if (!branch.is("intersection")) return { extracted: [], excluded: [branch] }
	return (
		splitRangeBranch(branch, rNode, budget) ??
		splitPropBranch(branch, rNode, budget) ?? {
			extracted: [],
			excluded: [branch]
		}
	)
}

const splitMorphBranch = (
	branch: Morph.Node,
	rNode: BaseRoot,
	budget: PartitionBudget
): PartitionResult | undefined => {
	if (!branch.head || branch.declaredIn) return
	// a morph extends what its input does, or a morph alike whose input its own extends
	const rHeadBranches: Union.ChildNode[] = []
	for (const r of rNode.branches) {
		if (!r.is("morph")) rHeadBranches.push(r)
		else if (branch.sameMorphs(r) && !r.declaredIn && r.head)
			rHeadBranches.push(...r.head.branches)
	}
	if (!rHeadBranches.length) return
	const rHead = branch.$.schema(rHeadBranches) as BaseRoot
	const [extractedHead, excludedHead] = partitionRoot(
		branch.head,
		rHead,
		budget
	)
	if (
		extractedHead.isNever() ||
		excludedHead.isNever() ||
		hashesMatch(extractedHead, branch.head) ||
		hashesMatch(excludedHead, branch.head)
	)
		return
	budget.remaining--
	const withHead = (head: BaseRoot) =>
		branch.$.node("morph", {
			...branch.inner,
			morphs: [head, ...branch.piped],
			meta: branch.meta
		})
	const extracted = withHead(extractedHead)
	if (!extracted.extends(rNode)) return
	return {
		extracted: [...extracted.branches],
		excluded: [...withHead(excludedHead).branches]
	}
}

const normalizeRange = (
	range: Range,
	family: RangeFamily
): Range | undefined => {
	let lower =
		family.lower === "minLength" && (!range.lower || range.lower.value < 0) ?
			{ value: 0 }
		:	range.lower
	let upper = range.upper
	const excludedSet = new Set(range.excluded)
	if (family.integral) {
		if (lower?.exclusive) lower = { value: lower.value + 1 }
		if (upper?.exclusive) upper = { value: upper.value - 1 }
		while (lower && excludedSet.has(lower.value))
			lower = { value: lower.value + 1 }
		while (upper && excludedSet.has(upper.value))
			upper = { value: upper.value - 1 }
		if (family.lower === "after") {
			if (lower && lower.value > maxDateMs) return
			if (upper && upper.value < -maxDateMs) return
			if (lower && lower.value < -maxDateMs) lower = { value: -maxDateMs }
			if (upper && upper.value > maxDateMs) upper = { value: maxDateMs }
		}
		if (lower && upper && lower.value > upper.value) return
	} else {
		if (lower && !lower.exclusive && excludedSet.has(lower.value))
			lower = { value: lower.value, exclusive: true }
		if (upper && !upper.exclusive && excludedSet.has(upper.value))
			upper = { value: upper.value, exclusive: true }
		if (
			lower &&
			upper &&
			(lower.value > upper.value ||
				(lower.value === upper.value && (lower.exclusive || upper.exclusive)))
		)
			return
	}
	const excluded = [...excludedSet]
		.filter(v => (!lower || v > lower.value) && (!upper || v < upper.value))
		.sort((a, b) => a - b)
	return { lower, upper, excluded }
}

const stricterLower = (
	l: Limit | undefined,
	r: Limit | undefined
): Limit | undefined =>
	!l ? r
	: !r ? l
	: l.value > r.value ? l
	: r.value > l.value ? r
	: l.exclusive ? l
	: r

const stricterUpper = (
	l: Limit | undefined,
	r: Limit | undefined
): Limit | undefined =>
	!l ? r
	: !r ? l
	: l.value < r.value ? l
	: r.value < l.value ? r
	: l.exclusive ? l
	: r

const intersectRange = (
	l: Range,
	r: Range,
	family: RangeFamily
): Range | undefined =>
	normalizeRange(
		{
			lower: stricterLower(l.lower, r.lower),
			upper: stricterUpper(l.upper, r.upper),
			excluded: [...l.excluded, ...r.excluded]
		},
		family
	)

const subtractRange = (l: Range, r: Range, family: RangeFamily): Range[] => {
	const parts: Range[] = []
	if (r.lower) {
		const below = intersectRange(
			l,
			{
				lower: undefined,
				upper: {
					value: r.lower.value,
					exclusive: r.lower.exclusive ? undefined : true
				},
				excluded: []
			},
			family
		)
		if (below) parts.push(below)
	}
	if (r.upper) {
		const above = intersectRange(
			l,
			{
				lower: {
					value: r.upper.value,
					exclusive: r.upper.exclusive ? undefined : true
				},
				upper: undefined,
				excluded: []
			},
			family
		)
		if (above) parts.push(above)
	}
	for (const v of r.excluded) {
		if (rangeIncludes(l, v)) {
			const point = normalizeRange(
				{ lower: { value: v }, upper: { value: v }, excluded: [] },
				family
			)
			if (point) parts.push(point)
		}
	}
	return parts
}

const rRangeOf = (
	r: Union.ChildNode,
	family: RangeFamily
): Range | undefined => {
	if (r.is("intersection")) {
		if (
			rangeFamilyMatchesNode(family, r) &&
			family.kinds.some(kind => r.inner[kind])
		)
			return rangeOf(r, family)
		return
	}
	if (r.is("unit")) {
		if (family.lower === "after" && r.unit instanceof Date) {
			const value = r.unit.valueOf()
			return { lower: { value }, upper: { value }, excluded: [] }
		}
		if (family.lower === "min" && typeof r.unit === "number") {
			return {
				lower: { value: r.unit },
				upper: { value: r.unit },
				excluded: []
			}
		}
		if (family.lower === "minLength" && r.unit === "")
			return { lower: { value: 0 }, upper: { value: 0 }, excluded: [] }
	}
}

const branchWithRange = (
	branch: Intersection.Node,
	range: Range,
	family: RangeFamily,
	boundMeta: ArkEnv.meta,
	unit: BoundUnit | undefined
): Union.ChildNode | undefined => {
	if (
		family.lower === "minLength" &&
		branch.inner.domain?.domain === "string" &&
		range.lower?.value === 0 &&
		range.upper?.value === 0
	) {
		return (
				childrenExcept(branch, family.kinds).every(child =>
					child.allowsUnused("" as never)
				)
			) ?
				(branch.$.node("unit", {
					unit: "",
					meta: branch.meta
				}) as Union.ChildNode)
			:	undefined
	}
	const inner: dict = { ...branch.inner }
	for (const kind of family.kinds) delete inner[kind]
	Object.assign(inner, rangeInner(range, family, boundMeta, unit, branch.$))
	const reduced = $ark.sets!.reduce("intersection", inner, branch.$)
	if (reduced instanceof Disjoint) return
	return branch.$.node("intersection", {
		...inner,
		meta: branch.meta
	}) as Union.ChildNode
}

const splitRangeBranch = (
	branch: Intersection.Node,
	rNode: BaseRoot,
	budget: PartitionBudget
): PartitionResult | undefined => {
	if (
		branch.inner.domain?.numberAllowsNaN ||
		branch.inner.proto?.dateAllowsInvalid
	)
		return
	const family = rangeFamilies.find(
		f => rangeFamilyMatchesNode(f, branch) && f.kinds.some(k => branch.inner[k])
	)
	if (!family) return
	const lRange = rangeOf(branch, family)
	const bounds = branch.children.filter(child =>
		family.kinds.includes(child.kind as RangeKind)
	)
	const boundMeta = sameMeta(bounds) ? (bounds[0]?.meta ?? {}) : {}
	const boundUnit =
		family.lower === "after" || !bounds.length ? undefined
		: bounds.every(b => sameBoundUnit(boundUnitOf(b), boundUnitOf(bounds[0]))) ?
			boundUnitOf(bounds[0])
		:	undefined
	for (const r of rNode.branches) {
		if (!branch.overlaps(r)) continue
		const rRange = rRangeOf(r, family)
		if (!rRange) continue
		const inRange = intersectRange(lRange, rRange, family)
		if (!inRange) continue
		const inNode = branchWithRange(
			branch,
			inRange,
			family,
			boundMeta,
			boundUnit
		)
		if (!inNode || hashesMatch(inNode, branch) || !inNode.extends(rNode))
			continue
		const outRanges = subtractRange(lRange, rRange, family)
		const outNodes: Union.ChildNode[] = []
		for (const outRange of outRanges) {
			const outNode = branchWithRange(
				branch,
				outRange,
				family,
				boundMeta,
				boundUnit
			)
			if (outNode && !hashesMatch(outNode, branch)) outNodes.push(outNode)
		}
		if (!outNodes.length) continue
		budget.remaining--
		const extracted: Union.ChildNode[] = [inNode]
		const excluded: Union.ChildNode[] = []
		for (const outNode of outNodes) {
			const sub = partitionBranch(outNode, rNode, budget)
			extracted.push(...sub.extracted)
			excluded.push(...sub.excluded)
		}
		return { extracted, excluded }
	}
}

const replaceProp = (
	branch: Intersection.Node,
	prop: Prop.Node,
	kind: Prop.Kind,
	value: BaseRoot
): Union.ChildNode => {
	const structure: dict = {
		...branch.structure!.inner,
		order: branch.structure!.keyOrder
	}
	const nextProp = branch.$.node(kind, {
		key: prop.key,
		value,
		meta: prop.meta
	})
	if (kind === prop.kind) {
		structure[prop.kind] = branch.structure![prop.kind]!.map(p =>
			p === prop ? nextProp : p
		)
	} else {
		const remaining = branch.structure![prop.kind]!.filter(p => p !== prop)
		if (remaining.length) structure[prop.kind] = remaining
		else delete structure[prop.kind]
		structure[kind] = [
			...((structure[kind] as Prop.Node[] | undefined) ?? []),
			nextProp
		]
	}
	return branch.$.node("intersection", {
		...branch.inner,
		structure: branch.$.node("structure", {
			...structure,
			meta: branch.structure!.meta
		} as never),
		meta: branch.meta
	}) as Union.ChildNode
}

// whether narrowing branch's existing props can possibly satisfy r's non-value constraints
const canBranchNarrowTo = (
	branch: Intersection.Node,
	r: Intersection.Node
): boolean => {
	const bStruct = branch.structure!
	const rStruct = r.structure!
	if (
		r.inner.proto &&
		(!branch.inner.proto || !branch.inner.proto.extends(r.inner.proto))
	)
		return false
	if (
		r.inner.predicate &&
		!r.inner.predicate.every(rp =>
			branch.inner.predicate?.some(bp => hashesMatch(bp, rp))
		)
	)
		return false
	for (const req of rStruct.required ?? []) {
		const bProp = bStruct.byKey[req.key]
		if (!bProp || (bProp.is("optional") && bProp.hasDef())) return false
	}
	if (rStruct.undeclared === "reject") {
		if (bStruct.undeclared !== "reject") return false
		for (const bProp of bStruct.required ?? []) {
			if (
				!(bProp.key in rStruct.byKey) &&
				!rStruct.index?.some(idx =>
					idx.signature.allowsUnused(bProp.key as never)
				)
			)
				return false
		}
	} else if (rStruct.undeclared === "delete" && !bStruct.undeclared)
		return false
	if (rStruct.index?.length && !bStruct.undeclared && !bStruct.index?.length)
		return false
	if (rStruct.sequence && !bStruct.sequence) return false
	return true
}

const splitPropBranch = (
	branch: Intersection.Node,
	rNode: BaseRoot,
	budget: PartitionBudget
): PartitionResult | undefined => {
	if (!branch.structure) return
	const rStructures: Intersection.Node[] = []
	for (const r of rNode.branches) {
		const resolved = r.is("alias") ? peekAliasResolution(r) : r
		if (
			resolved?.is("intersection") &&
			resolved.structure &&
			canBranchNarrowTo(branch, resolved) &&
			branch.overlaps(r)
		)
			rStructures.push(resolved)
	}
	if (!rStructures.length) return
	for (const prop of branch.structure.props) {
		if (prop.is("optional") && prop.hasDef()) continue
		const targets: { value: BaseRoot; permitsMissing: boolean }[] = []
		for (const r of rStructures) {
			const rProp = r.structure!.byKey[prop.key]
			if (
				rProp &&
				!prop.value.extends(rProp.value) &&
				prop.value.overlaps(rProp.value)
			)
				targets.push({ value: rProp.value, permitsMissing: rProp.optional })
			if (r.structure!.index) {
				for (const idx of r.structure!.index) {
					if (
						idx.signature.allowsUnused(prop.key as never) &&
						!prop.value.extends(idx.value) &&
						prop.value.overlaps(idx.value)
					)
						targets.push({ value: idx.value, permitsMissing: true })
				}
			}
		}
		for (const { value: target, permitsMissing } of targets) {
			const [extractedVal, excludedVal] = partitionRoot(
				prop.value,
				target,
				budget
			)
			if (
				extractedVal.isNever() ||
				excludedVal.isNever() ||
				hashesMatch(extractedVal, prop.value) ||
				hashesMatch(excludedVal, prop.value)
			)
				continue
			budget.remaining--
			const extractedKind: Prop.Kind =
				prop.required ? "required"
				: permitsMissing ? "optional"
				: "required"
			const excludedKind: Prop.Kind =
				prop.required ? "required"
				: permitsMissing ? "required"
				: "optional"
			const withExtracted = replaceProp(
				branch,
				prop,
				extractedKind,
				extractedVal
			)
			const withExcluded = replaceProp(branch, prop, excludedKind, excludedVal)
			const left = partitionBranch(withExtracted, rNode, budget)
			const right = partitionBranch(withExcluded, rNode, budget)
			return {
				extracted: [...left.extracted, ...right.extracted],
				excluded: [...left.excluded, ...right.excluded]
			}
		}
	}
}

// a merge keeps a node only if its counterpart has the same meta and bound units
const nodesEqual = (l: readonly BaseNode[], r: readonly BaseNode[]) =>
	arrayEquals(l, r, {
		isEqual: (a, b) =>
			hashesMatch(a, b) &&
			sameSymbolMeta(a.meta, b.meta) &&
			sameBoundUnits(a, b)
	})

const sequencesMatch = (
	l: Sequence.Node | undefined,
	r: Sequence.Node | undefined
) =>
	l && r ?
		hashesMatch(l, r) && sameSymbolMeta(l.meta, r.meta) && sameBoundUnits(l, r)
	:	l === r

const sameSymbolMeta = (l: object, r: object): boolean => {
	const lSyms = Object.getOwnPropertySymbols(l)
	const rSyms = Object.getOwnPropertySymbols(r)
	if (lSyms.length !== rSyms.length) return false
	for (const sym of lSyms) {
		if (
			!Object.prototype.hasOwnProperty.call(r, sym) ||
			!Object.is((l as dict)[sym as never], (r as dict)[sym as never])
		)
			return false
	}
	return true
}

// a merge replaces nodes only if they agree on the meta their replacement keeps
const sameMeta = (nodes: readonly BaseNode[]) => {
	if (nodes.length < 2) return true
	const first = nodes[0]
	const firstJson = JSON.stringify(first.metaJson)
	for (let i = 1; i < nodes.length; i++) {
		const node = nodes[i]
		if (
			JSON.stringify(node.metaJson) !== firstJson ||
			!sameSymbolMeta(first.meta, node.meta)
		)
			return false
	}
	return true
}

const childrenExcept = (node: Intersection.Node, kinds: readonly NodeKind[]) =>
	node.children.filter(child => !kinds.includes(child.kind))

// whether the branches are joined: all either does to data both allow is
// delete undeclared keys, and not the same ones, so that data keeps each key
// either does and neither is transformed before the other
const assertDeterminateOverlap = (
	l: Union.ChildNode,
	r: Union.ChildNode
): boolean => {
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
			return false
		}
		if (!l.tfs && !r.tfs) return false
	} else if (!l.alters && !r.alters) return false

	const joined = joinedIfDeterminate(l, r)
	if (joined !== null) return joined

	return throwParseError(
		writeIndiscriminableMorphMessage(
			l.expression,
			r.expression,
			describeIndiscriminableDetails(l, r)
		)
	)
}

const joinedIfDeterminate = (
	l: Union.ChildNode,
	r: Union.ChildNode
): boolean | null => {
	const narrows = narrowsToOverlap(l, r)
	if (sameTransforms(l, r, flatMorphsAreEqual)) {
		// a morph both apply could be one only one applies to some of what they
		// share, like a key's number that one measures and the other allows as
		// it is, unless they apply it to the same inputs, or would once narrowed
		if (sameTransforms(l, r, flatMorphsAllowAlike)) return false
		if (!narrows) return null
		const overlapping = narrowToOverlap(l, r)
		return (
				!overlapping ||
					sameTransforms(overlapping[0], overlapping[1], flatMorphsAllowAlike)
			) ?
				false
			:	null
	}

	if (l.deletesOnly && r.deletesOnly) return true

	// nor does either transform what the other leaves if narrowed, they're one Type
	const overlapping = narrows && narrowToOverlap(l, r)
	return overlapping && overlapping[0].equals(overlapping[1]) ? false : null
}

type FlatMorph = FlatRef<Morph.Node | Intersection.Node>

const sameTransforms = (
	l: BaseRoot,
	r: BaseRoot,
	isEqual: (l: FlatMorph, r: FlatMorph) => boolean
): boolean =>
	arrayEquals(l.topMorphs as Morph[], r.topMorphs as Morph[]) &&
	(l as Morph.Node).inverse === (r as Morph.Node).inverse &&
	arrayEquals(l.flatMorphs, r.flatMorphs, { isEqual }) &&
	arrayEquals(transformingAliasRefsOf(l), transformingAliasRefsOf(r), {
		isEqual: flatRefsAreEqual
	})

const flatMorphsAllowAlike = (l: FlatMorph, r: FlatMorph): boolean =>
	flatMorphsAreEqual(l, r) &&
	(l.node === r.node ||
		!l.node.is("morph") ||
		(l.node._in.extends(r.node._in) && r.node._in.extends(l.node._in)))

// a default is given to data lacking its key even where the other rejects the
// key, which narrowed to it would drop the default, and an alias narrowed is
// one more to resolve
const narrowsToOverlap = (l: Union.ChildNode, r: Union.ChildNode): boolean =>
	!l.hasAlias && !r.hasAlias && !reachesDefault(l) && !reachesDefault(r)

// each narrowed to the input both allow, where a transform one applies only to
// data the other rejects, like a morph on another branch of a key's union, is
// gone
const narrowToOverlap = (
	l: Union.ChildNode,
	r: Union.ChildNode
): [l: BaseRoot, r: BaseRoot] | null => {
	const overlap = intersectNodesRoot(l._in, r._in, l.$)
	if (overlap instanceof Disjoint) return null
	const lOverlap = intersectNodesRoot(l, overlap, l.$)
	if (lOverlap instanceof Disjoint) return null
	const rOverlap = intersectNodesRoot(r, overlap, l.$)
	return rOverlap instanceof Disjoint ? null : [lOverlap, rOverlap]
}

// whether a case's branches, pruned of what told the data they share apart from
// what only one transforms, are still found to do the same to it
const staysDeterminate = (entries: readonly BranchEntry[]): boolean => {
	for (let i = 0; i < entries.length - 1; i++) {
		const l = entries[i].branch as Union.ChildNode
		for (let j = i + 1; j < entries.length; j++) {
			const r = entries[j].branch as Union.ChildNode
			if (
				(l.tfs || r.tfs) &&
				!(intersectNodesRoot(l._in, r._in, l.$) instanceof Disjoint) &&
				joinedIfDeterminate(l, r) === null
			)
				return false
		}
	}
	return true
}

const peekAliasResolution = (alias: Alias.Node): BaseRoot | undefined => {
	const registered = $ark.nodesById.get(alias.reference) ?? alias.target
	if (isNode(registered)) return registered as BaseRoot
	if (hasArkKind(registered, "context") && registered.phase === "member")
		return registered.resolution
	if (alias.resolve && isResolutionFinal()) return alias.resolution
	return undefined
}

const transformingAliasRefsOf = (node: BaseRoot): FlatRef[] =>
	node.flatRefs.filter(ref => ref.node.is("alias") && ref.node.tfs)

const formatFlatPath = (path: readonly KeyOrKeyNode[]): string =>
	stringifyPath(path, {
		stringifyNonKey: node =>
			node.equals($ark.kw.nonNegativeIntegerString.internal) ? "number" : (
				node.expression
			)
	})

const morphLabelOf = (morphs: readonly Morph[]): string | undefined => {
	const names = morphs.map(m => m.name).filter(Boolean)
	return names.length ? names.join(" -> ") : undefined
}

const defaultMorphsByKey = (node: Union.ChildNode): Map<PropertyKey, Morph> => {
	const map = new Map<PropertyKey, Morph>()
	if (!node.is("intersection") || !node.structure) return map
	for (const p of node.structure.defaultable) map.set(p.key, p.defMorph)
	const seq = node.structure.sequence
	if (seq?.defaultables) {
		const offset = seq.prefix?.length ?? 0
		for (let i = 0; i < seq.defaultables.length; i++)
			map.set(offset + i, seq.defMorphs[i])
	}
	return map
}

const differingDefaultKeys = (
	l: Union.ChildNode,
	r: Union.ChildNode
): string[] => {
	const lDefs = defaultMorphsByKey(l)
	const rDefs = defaultMorphsByKey(r)
	const keys = new Set<PropertyKey>([...lDefs.keys(), ...rDefs.keys()])
	const differing: string[] = []
	for (const k of keys) {
		if (lDefs.get(k) !== rDefs.get(k)) {
			differing.push(
				typeof k === "number" ? `[${k}]` : formatFlatPath([k as Key])
			)
		}
	}
	return differing
}

const describeIndiscriminableDetails = (
	l: Union.ChildNode,
	r: Union.ChildNode
): string | undefined => {
	const lFlat = l.flatMorphs
	const rFlat = r.flatMorphs
	const conflictPaths = new Set<string>()
	const lFlatAt = new Map<string, FlatRef<Morph.Node | Intersection.Node>[]>()
	const rFlatAt = new Map<string, FlatRef<Morph.Node | Intersection.Node>[]>()

	for (const ref of lFlat) {
		if (!rFlat.some(other => flatMorphsAllowAlike(ref, other))) {
			const formatted = formatFlatPath(ref.path)
			conflictPaths.add(formatted)
			;(
				lFlatAt.get(formatted) ?? lFlatAt.set(formatted, []).get(formatted)!
			).push(ref)
		}
	}
	for (const ref of rFlat) {
		if (!lFlat.some(other => flatMorphsAllowAlike(ref, other))) {
			const formatted = formatFlatPath(ref.path)
			conflictPaths.add(formatted)
			;(
				rFlatAt.get(formatted) ?? rFlatAt.set(formatted, []).get(formatted)!
			).push(ref)
		}
	}

	const lAliases = transformingAliasRefsOf(l)
	const rAliases = transformingAliasRefsOf(r)
	for (const ref of lAliases) {
		if (!rAliases.some(other => flatRefsAreEqual(ref, other)))
			conflictPaths.add(formatFlatPath(ref.path))
	}
	for (const ref of rAliases) {
		if (!lAliases.some(other => flatRefsAreEqual(ref, other)))
			conflictPaths.add(formatFlatPath(ref.path))
	}

	for (const k of differingDefaultKeys(l, r)) conflictPaths.add(k)

	const paths = [...conflictPaths].sort()
	const sameExpression = l.expression === r.expression

	if (paths.length === 1) {
		const path = paths[0]
		const lRefs = lFlatAt.get(path)
		const rRefs = rFlatAt.get(path)
		if (
			lRefs?.length === 1 &&
			rRefs?.length === 1 &&
			lRefs[0].node.is("morph") &&
			rRefs[0].node.is("morph")
		) {
			const lName = morphLabelOf(lRefs[0].node.piped as Morph[])
			const rName = morphLabelOf(rRefs[0].node.piped as Morph[])
			if (lName && rName && lName !== rName)
				return `Conflicting morph at ${path}: ${lName} vs ${rName}`
		}
		return sameExpression ?
				`Conflicting morph at ${path} (distinct morphs with identical expressions)`
			:	`Conflicting morph at ${path}`
	}

	if (paths.length > 1) {
		const shown =
			paths.length > 3 ?
				`${paths.slice(0, 3).join(", ")} (+${paths.length - 3} more)`
			:	paths.join(", ")
		return `Conflicting morphs at ${shown}`
	}

	if (l.is("morph") && r.is("morph")) {
		const lName = morphLabelOf(l.piped as Morph[])
		const rName = morphLabelOf(r.piped as Morph[])
		if (lName && rName && lName !== rName)
			return `Conflicting morphs: ${lName} vs ${rName}`
		if (sameExpression) {
			return l.inverse !== r.inverse ?
					"Left and Right have distinct codec encoders despite identical expressions"
				:	"Left and Right have distinct morphs despite identical expressions"
		}
	}

	return undefined
}

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

const prunesToNull = (node: BaseRoot, kind: DiscriminantKind): boolean => {
	if (node.is("unit")) return kind === "unit" || isDomainUnit(node)
	if (node.is("domain")) {
		return (
			node.domain !== "number" ||
			(!!node.numberAllowsNaN && !!node.numberAllowsInfinity)
		)
	}
	return false
}

export const pruneDiscriminant = (
	discriminantBranch: BaseRoot,
	discriminantCtx: DiscriminantLocation
): BaseRoot | null => {
	const path = discriminantCtx.path
	// fast path for depth-1 required prop removal on plain object intersections
	if (
		path.length === 1 &&
		typeof path[0] !== "number" &&
		discriminantBranch.is("intersection") &&
		discriminantBranch.structure &&
		!discriminantBranch.inner.predicate &&
		!discriminantBranch.structure.undeclared &&
		!discriminantBranch.structure.index &&
		!discriminantBranch.structure.sequence &&
		isEmptyObject(discriminantBranch.meta) &&
		isEmptyObject(discriminantBranch.structure.meta)
	) {
		const key = path[0]
		const struct = discriminantBranch.structure
		const prop = struct.byKey[key]
		if (
			prop?.required &&
			isEmptyObject(prop.meta) &&
			prunesToNull(prop.value, discriminantCtx.kind)
		) {
			const dropDomain =
				discriminantBranch.inner.domain?.domain === "object" &&
				!isReadableOnPrimitive(key)
			const remainingRequired = struct.required!.filter(p => p !== prop)
			const nextInner: dict = { ...discriminantBranch.inner }
			if (dropDomain) delete nextInner.domain
			if (remainingRequired.length || struct.optional?.length) {
				const structInner: dict = { ...struct.inner }
				if (remainingRequired.length) structInner.required = remainingRequired
				else delete structInner.required
				if (structInner.order) {
					const order = (structInner.order as Key[]).filter(k => k !== key)
					if (order.length) structInner.order = order
					else delete structInner.order
				}
				nextInner.structure = discriminantBranch.$.node(
					"structure",
					structInner as never
				)
			} else delete nextInner.structure
			const remainingKeys = Object.keys(nextInner)
			if (!remainingKeys.length) return null
			return discriminantBranch.$.node("intersection", nextInner as never)
		}
	}
	return discriminantBranch.transform(
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
				if (ctx.path.length > path.length) return false
				for (let i = 0; i < ctx.path.length; i++)
					if (ctx.path[i] !== path[i]) return false

				// pruning a union's branches narrows it, e.g. string | number to number
				if (node.is("union")) return false

				// a predicate implies no basis, so pruning its basis or constraints
				// could let an overlapping case intersect and run it against an invalid value
				if (node.is("intersection") && node.inner.predicate) return false

				if (node.is("domain") && node.domain === "object")
					// if we've already checked a path at least as long as the current one,
					// we don't need to revalidate that we're in an object
					// unless a primitive has its next key
					return !isReadableOnPrimitive(path[ctx.path.length])

				if (
					(node.is("domain") ||
						discriminantCtx.kind === "unit" ||
						isDomainUnit(node)) &&
					ctx.path.length === path.length
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
}

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

const builtinObjectPrototypes = [
	Object.prototype,
	Array.prototype,
	Function.prototype,
	RegExp.prototype,
	Error.prototype
]

// own non-enumerable properties on built-in objects not already on builtinObjectPrototypes
const builtinNonEnumerableKeys: ReadonlySet<PropertyKey> = new Set([
	"prototype",
	"lastIndex",
	"stack",
	"cause"
])

// keys an optional chain can read on an object even though Object.keys skips them
const isBuiltinNonEnumerableKey = (key: PropertyKey): boolean =>
	builtinNonEnumerableKeys.has(key) ||
	builtinObjectPrototypes.some(proto => key in proto)

// index signatures and undeclared-key handling only inspect own enumerable keys,
// whereas switch (data?.k) reads non-enumerable/inherited keys such as array or
// function .length. A disjoint coming from an index signature (or undeclared
// handling at a built-in non-enumerable key) does not exclude the branch.
const disjointLeavesKeyOverlap = (
	branch: BaseRoot,
	disjoint: Disjoint
): boolean =>
	disjoint.length > 0 &&
	disjoint.every(entry => disjointEntryLeavesKeyOverlap(branch, entry, 0))

const disjointEntryLeavesKeyOverlap = (
	node: BaseRoot,
	entry: DisjointEntry,
	depth: number
): boolean => {
	if (depth >= entry.path.length) return false
	if (node.is("alias")) {
		return isResolutionFinal() ?
				disjointEntryLeavesKeyOverlap(node.resolution, entry, depth)
			:	false
	}
	if (node.is("union")) {
		return node.branches.some(b =>
			disjointEntryLeavesKeyOverlap(b, entry, depth)
		)
	}
	if (!node.is("intersection") || !node.structure) return false
	const key = entry.path[depth]
	if (typeof key === "number") {
		const sequence = node.structure.sequence
		if (!sequence) return false
		if (!sequence.postfix) {
			const element =
				key < sequence.leading.length ?
					sequence.tuple[key].node
				:	sequence.variadic
			return element ?
					disjointEntryLeavesKeyOverlap(element, entry, depth + 1)
				:	false
		}
		return sequence.tuple.some(el =>
			disjointEntryLeavesKeyOverlap(el.node, entry, depth + 1)
		)
	}
	const prop = node.structure.byKey[key]
	if (prop) return disjointEntryLeavesKeyOverlap(prop.value, entry, depth + 1)
	if (entry.undeclared) return isBuiltinNonEnumerableKey(key)
	// a disjoint at an undeclared key without undeclared handling comes from an index signature
	if (!node.structure.index) return false
	if (isBuiltinNonEnumerableKey(key)) return true
	return (
		depth < entry.path.length - 1 &&
		node.structure.index.some(
			idx =>
				idx.signature.allowsUnused(key) &&
				disjointEntryLeavesKeyOverlap(idx.value, entry, depth + 1)
		)
	)
}

// whether a disjoint excluded a branch solely via own-enumerable-only checks
// ("+": "reject" or an index signature), which do not reject inherited or
// non-enumerable properties read by switch (data?.k)
const disjointUsesOwnEnumerableCheck = (
	branch: BaseRoot,
	disjoint: Disjoint
): boolean =>
	disjoint.length > 0 &&
	disjoint.every(entry => disjointEntryUsesOwnEnumerableCheck(branch, entry, 0))

const disjointEntryUsesOwnEnumerableCheck = (
	node: BaseRoot,
	entry: DisjointEntry,
	depth: number
): boolean => {
	if (depth >= entry.path.length) return false
	if (node.is("alias")) {
		return isResolutionFinal() ?
				disjointEntryUsesOwnEnumerableCheck(node.resolution, entry, depth)
			:	false
	}
	if (node.is("union")) {
		return node.branches.some(b =>
			disjointEntryUsesOwnEnumerableCheck(b, entry, depth)
		)
	}
	if (!node.is("intersection") || !node.structure) return false
	const key = entry.path[depth]
	if (typeof key === "number") {
		const sequence = node.structure.sequence
		if (!sequence) return false
		if (!sequence.postfix) {
			const element =
				key < sequence.leading.length ?
					sequence.tuple[key].node
				:	sequence.variadic
			return element ?
					disjointEntryUsesOwnEnumerableCheck(element, entry, depth + 1)
				:	false
		}
		return sequence.tuple.some(el =>
			disjointEntryUsesOwnEnumerableCheck(el.node, entry, depth + 1)
		)
	}
	const prop = node.structure.byKey[key]
	if (prop)
		return disjointEntryUsesOwnEnumerableCheck(prop.value, entry, depth + 1)
	return !!entry.undeclared || node.structure.index !== undefined
}

export const writeIndiscriminableMorphMessage = (
	lDescription: string,
	rDescription: string,
	details?: string
): string =>
	`An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: ${lDescription}
Right: ${rDescription}
Make their inputs disjoint (e.g. with a discriminant key or narrower morph input), or pipe the union of their inputs to a single morph.${details ? `\n${details}` : ""}`

export const writeOrderedIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
