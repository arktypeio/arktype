import {
	Disjoint,
	compileLiteralPropAccess,
	flatMorphsAreEqual,
	type BaseRoot,
	type BaseScope,
	type CaseKey,
	type Discriminant,
	type DiscriminantKind,
	type DiscriminantLocation,
	type DiscriminatedCases,
	type Domain,
	type Morph,
	type Union,
	type Unit,
	type nodeOfKind
} from "@ark/schema"
import {
	appendUnique,
	arrayEquals,
	flatMorph,
	range,
	throwParseError
} from "@ark/util"
import {
	defineRightwardIntersections,
	type IntersectionContext,
	type setImplementationOf
} from "../implement.ts"
import { intersectNodesRoot, intersectOrPipeNodes } from "../intersections.ts"

export const union: setImplementationOf<Union.Declaration> = {
	reduce: (inner, $) => {
		const reducedBranches = reduceBranches(inner)
		if (reducedBranches.length === 1) return reducedBranches[0]

		if (reducedBranches.length === inner.branches.length) return

		return $.node(
			"union",
			{
				...inner,
				branches: reducedBranches
			},
			{ prereduced: true }
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

			return ctx.$.parseSchema(
				l.ordered || r.ordered ?
					{
						branches: resultBranches,
						ordered: true as const
					}
				:	{ branches: resultBranches }
			)
		},
		...defineRightwardIntersections("union", (l, r, ctx) => {
			const branches = intersectBranches(l.branches, [r], ctx)
			if (branches instanceof Disjoint) return branches

			if (branches.length === 1) return branches[0]

			return ctx.$.parseSchema(
				l.ordered ? { branches, ordered: true } : { branches }
			)
		})
	}
}

export const discriminate = (node: Union.Node): Discriminant | null => {
	if (node.branches.length < 2) return null
	if (node.unitBranches.length === node.branches.length) {
		const cases = flatMorph(node.unitBranches, (i, n) => [
			`${(n.rawIn as Unit.Node).serializedValue}`,
			n.hasKind("morph") ? n : (true as const)
		])

		return {
			kind: "unit",
			path: [],
			optionallyChainedPropString: "data",
			cases
		}
	}
	const candidates: DiscriminantCandidate[] = []
	for (let lIndex = 0; lIndex < node.branches.length - 1; lIndex++) {
		const l = node.branches[lIndex]
		for (let rIndex = lIndex + 1; rIndex < node.branches.length; rIndex++) {
			const r = node.branches[rIndex]
			const result = intersectNodesRoot(l.rawIn, r.rawIn, l.$)
			if (!(result instanceof Disjoint)) continue

			for (const entry of result) {
				if (!entry.kind || entry.optional) continue

				let lSerialized: string
				let rSerialized: string

				if (entry.kind === "domain") {
					const lValue = entry.l as Domain.Node | Domain.Enumerable
					const rValue = entry.r as Domain.Node | Domain.Enumerable
					lSerialized = `"${typeof lValue === "string" ? lValue : lValue.domain}"`
					rSerialized = `"${typeof rValue === "string" ? rValue : rValue.domain}"`
				} else if (entry.kind === "unit") {
					lSerialized = (entry.l as Unit.Node).serializedValue
					rSerialized = (entry.r as Unit.Node).serializedValue
				} else continue

				const matching = candidates.find(
					d => arrayEquals(d.path, entry.path) && d.kind === entry.kind
				)

				if (!matching) {
					candidates.push({
						kind: entry.kind,
						cases: {
							[lSerialized]: {
								branchIndices: [lIndex],
								condition: entry.l as never
							},
							[rSerialized]: {
								branchIndices: [rIndex],
								condition: entry.r as never
							}
						},
						path: entry.path
					})
				} else {
					if (matching.cases[lSerialized]) {
						matching.cases[lSerialized].branchIndices = appendUnique(
							matching.cases[lSerialized].branchIndices,
							lIndex
						)
					} else {
						matching.cases[lSerialized] ??= {
							branchIndices: [lIndex],
							condition: entry.l as never
						}
					}

					if (matching.cases[rSerialized]) {
						matching.cases[rSerialized].branchIndices = appendUnique(
							matching.cases[rSerialized].branchIndices,
							rIndex
						)
					} else {
						matching.cases[rSerialized] ??= {
							branchIndices: [rIndex],
							condition: entry.r as never
						}
					}
				}
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

		const caseNode =
			branches.length === 1 ?
				branches[0]
			:	node.$.node(
					"union",
					node.ordered ? { branches, ordered: true } : branches
				)

		node.caseNodes.push(caseNode)
		cases[k] = caseNode
		const branch = node.branches[resolution[0].originalIndex]
		if (branches.length === 1 && branch.includesAlias)
			(members ??= {})[k] = branch
	}

	if (ctx.defaultEntries.length) {
		// we don't have to worry about order here as it is always preserved
		// within defaultEntries
		const branches = ctx.defaultEntries.map(entry => entry.branch)
		cases.default = node.$.node(
			"union",
			node.ordered ? { branches, ordered: true } : branches,
			{
				prereduced: true
			}
		)

		node.caseNodes.push(cases.default)
	}

	return Object.assign(ctx.location, members ? { cases, members } : { cases })
}

// New context object to carry discrimination state between functions.
type CaseResolutionContext = {
	best: DiscriminantCandidate
	location: DiscriminantLocation
	defaultEntries: BranchEntry[]
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
	const ordered = viableCandidates.sort((l, r) =>
		l.path.length === r.path.length ?
			Object.keys(r.cases).length - Object.keys(l.cases).length
			// prefer shorter paths first
		:	l.path.length - r.path.length
	)

	const best = ordered[0]

	const location: DiscriminantLocation = {
		kind: best.kind,
		path: best.path,
		optionallyChainedPropString: optionallyChainPropString(best.path)
	}

	const defaultEntries = node.branches.map(
		(branch, originalIndex): BranchEntry => ({
			originalIndex,
			branch
		})
	)

	return {
		best,
		location,
		defaultEntries,
		node
	}
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

	let resolvedEntries: BranchEntry[] | null = []
	const nextDefaults: BranchEntry[] = []

	for (let i = 0; i < ctx.defaultEntries.length; i++) {
		const entry = ctx.defaultEntries[i]
		if (caseCtx.branchIndices.includes(entry.originalIndex)) {
			const pruned = pruneDiscriminant(
				ctx.node.branches[entry.originalIndex],
				ctx.location
			)
			if (pruned === null) {
				// if any branch of the union has no constraints (i.e. is
				// unknown), the others won't affect the resolution type, but could still
				// remove additional cases from defaultEntries
				resolvedEntries = null
			} else {
				resolvedEntries?.push({
					originalIndex: entry.originalIndex,
					branch: pruned
				})
			}
		} else {
			if (entry.branch.rawIn.overlaps(discriminantNode)) {
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

	ctx.defaultEntries = nextDefaults
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
								originalBranches[currentIndex].overlaps(
									originalBranches[nextIndex]
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

const discriminantCaseToNode = (
	caseDiscriminant: CaseDiscriminant,
	path: PropertyKey[],
	$: BaseScope
): BaseRoot => {
	let node: BaseRoot =
		caseDiscriminant === "undefined" ? $.node("unit", { unit: undefined })
		: caseDiscriminant === "null" ? $.node("unit", { unit: null })
		: caseDiscriminant === "boolean" ? $.units([true, false])
		: caseDiscriminant
	for (let i = path.length - 1; i >= 0; i--) {
		const key = path[i]
		node = $.node(
			"intersection",
			typeof key === "number" ?
				{
					proto: "Array",
					// create unknown for preceding elements (could be optimized with safe imports)
					sequence: [...range(key).map(_ => ({})), node]
				}
			:	{
					domain: "object",
					required: [{ key, value: node }]
				}
		)
	}
	return node
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

export const reduceBranches = ({
	branches,
	ordered
}: Union.Inner): readonly Union.ChildNode[] => {
	if (branches.length < 2) return branches

	const uniquenessByIndex: Record<number, boolean> = branches.map(() => true)
	for (let i = 0; i < branches.length; i++) {
		for (
			let j = i + 1;
			j < branches.length && uniquenessByIndex[i] && uniquenessByIndex[j];
			j++
		) {
			if (branches[i].equals(branches[j])) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			// an alias branch is reduced once the union is rebuilt from its resolution
			if (branches[i].includesShallowAlias || branches[j].includesShallowAlias)
				continue
			const intersection = intersectNodesRoot(
				branches[i].rawIn,
				branches[j].rawIn,
				branches[0].$
			)!
			if (intersection instanceof Disjoint) continue

			if (!ordered) assertDeterminateOverlap(branches[i], branches[j])

			if (intersection.equals(branches[i].rawIn)) {
				// preserve ordered branches that are a subtype of a subsequent branch
				uniquenessByIndex[i] = !!ordered
			} else if (intersection.equals(branches[j].rawIn))
				uniquenessByIndex[j] = false
		}
	}
	return branches.filter((_, i) => uniquenessByIndex[i])
}

const assertDeterminateOverlap = (l: Union.ChildNode, r: Union.ChildNode) => {
	if (!l.includesTransform && !r.includesTransform) return

	if (!arrayEquals(l.shallowMorphs as Morph[], r.shallowMorphs as Morph[])) {
		throwParseError(
			writeIndiscriminableMorphMessage(l.expression, r.expression)
		)
	}

	if (
		!arrayEquals(l.flatMorphs, r.flatMorphs, { isEqual: flatMorphsAreEqual })
	) {
		throwParseError(
			writeIndiscriminableMorphMessage(l.expression, r.expression)
		)
	}
}

type CaseContext = {
	branchIndices: number[]
	condition: nodeOfKind<DiscriminantKind> | Domain.Enumerable
}

type CaseDiscriminant = nodeOfKind<DiscriminantKind> | Domain.Enumerable

type DiscriminantCandidate<kind extends DiscriminantKind = DiscriminantKind> = {
	path: PropertyKey[]
	kind: kind
	cases: CandidateCases<kind>
}

type CandidateCases<kind extends DiscriminantKind = DiscriminantKind> = {
	[caseKey in CaseKey<kind>]: CaseContext
}

export const pruneDiscriminant = (
	discriminantBranch: BaseRoot,
	discriminantCtx: DiscriminantLocation
): BaseRoot | null =>
	discriminantBranch.transform(
		(nodeKind, inner) => {
			if (nodeKind === "domain" || nodeKind === "unit") return null

			return inner
		},
		{
			shouldTransform: (node, ctx) => {
				// safe to cast here as index nodes are never discriminants
				const propString = optionallyChainPropString(ctx.path as PropertyKey[])

				if (!discriminantCtx.optionallyChainedPropString.startsWith(propString))
					return false

				if (node.hasKind("domain") && node.domain === "object")
					// if we've already checked a path at least as long as the current one,
					// we don't need to revalidate that we're in an object
					return true

				if (
					(node.hasKind("domain") || discriminantCtx.kind === "unit") &&
					propString === discriminantCtx.optionallyChainedPropString
				)
					// if the discriminant has already checked the domain at the current path
					// (or a unit literal, implying a domain), we don't need to recheck it
					return true

				// we don't need to recurse into index nodes as they will never
				// have a required path therefore can't be used to discriminate
				return node.children.length !== 0 && node.kind !== "index"
			}
		}
	)

export const writeIndiscriminableMorphMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`

export const writeOrderedIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
