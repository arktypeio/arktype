import {
	type Domain,
	entriesOf,
	type evaluate,
	isKeyOf,
	type keySet,
	type mutable,
	type SerializedPrimitive,
	throwInternalError
} from "@arktype/util"
import { compileSerializedValue } from "../io/compile.ts"
import { Disjoint, type SerializedPath } from "../shared/disjoint.ts"
import type { BranchNode } from "./union.ts"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
	DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type Discriminant<kind extends DiscriminantKind = DiscriminantKind> =
	Readonly<{
		readonly path: string[]
		readonly kind: kind
		readonly cases: DiscriminatedCases<kind>
		// TODO: add default here?
		readonly isPureRootLiteral: boolean
	}>

export type DiscriminatedCases<
	kind extends DiscriminantKind = DiscriminantKind
> = Readonly<{
	[caseKey in CaseKey<kind>]: Discriminant | BranchNode[]
}>

type DiscriminantKey = `${SerializedPath}${DiscriminantKind}`

type CasesBySpecifier = {
	[k in DiscriminantKey]?: Record<string, BranchNode[]>
}

export type DiscriminantKinds = {
	domain: Domain
	value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
	domain: 1,
	value: 1
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const parseDiscriminantKey = (key: DiscriminantKey) => {
	const lastPathIndex = key.lastIndexOf("]")
	return [
		JSON.parse(key.slice(0, lastPathIndex + 1)),
		key.slice(lastPathIndex + 1)
	] as [path: string[], kind: DiscriminantKind]
}

const discriminantCache = new Map<readonly BranchNode[], Discriminant | null>()

export const discriminate = (
	branches: readonly BranchNode[]
): Discriminant | null => {
	if (branches.length < 2) {
		return null
	}
	const cached = discriminantCache.get(branches)
	if (cached !== undefined) {
		return cached
	}
	// const pureValueBranches = branches.flatMap((branch) =>
	// 	branch.unit ? branch.unit : []
	// )
	// if (pureValueBranches.length === branches.length) {
	// 	const cases: DiscriminatedCases = transform(
	// 		pureValueBranches,
	// 		([i, valueNode]) => [valueNode.serialized, [branches[i]]]
	// 	)
	// 	return {
	// 		path: [],
	// 		kind: "value",
	// 		cases,
	// 		isPureRootLiteral: true
	// 	}
	// }
	const casesBySpecifier: CasesBySpecifier = {}
	for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
		const l = branches[lIndex]
		for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
			const r = branches[rIndex]
			const result = l.intersect(r)
			if (!(result instanceof Disjoint)) {
				continue
			}
			for (const { path, kind, disjoint } of result.flat) {
				if (!isKeyOf(kind, discriminantKinds)) {
					continue
				}
				const qualifiedDiscriminant: DiscriminantKey = `${path}${kind}`
				let lSerialized: string
				let rSerialized: string
				if (kind === "domain") {
					lSerialized = disjoint.l as Domain
					rSerialized = disjoint.r as Domain
				} else if (kind === "value") {
					lSerialized = compileSerializedValue(disjoint.l)
					rSerialized = compileSerializedValue(disjoint.r)
				} else {
					return throwInternalError(
						`Unexpected attempt to discriminate disjoint kind '${kind}'`
					)
				}
				if (!casesBySpecifier[qualifiedDiscriminant]) {
					casesBySpecifier[qualifiedDiscriminant] = {
						[lSerialized]: [l],
						[rSerialized]: [r]
					}
					continue
				}
				const cases = casesBySpecifier[qualifiedDiscriminant]!
				if (!isKeyOf(lSerialized, cases)) {
					cases[lSerialized] = [l]
				} else if (!cases[lSerialized].includes(l)) {
					cases[lSerialized].push(l)
				}
				if (!isKeyOf(rSerialized, cases)) {
					cases[rSerialized] = [r]
				} else if (!cases[rSerialized].includes(r)) {
					cases[rSerialized].push(r)
				}
			}
		}
	}
	// TODO: determinstic? Update cache key?
	const bestDiscriminantEntry = entriesOf(casesBySpecifier)
		.sort((a, b) => Object.keys(a[1]).length - Object.keys(b[1]).length)
		.at(-1)
	if (!bestDiscriminantEntry) {
		discriminantCache.set(branches, null)
		return null
	}
	const [specifier, predicateCases] = bestDiscriminantEntry
	const [path, kind] = parseDiscriminantKey(specifier)
	const cases: mutable<DiscriminatedCases> = {}
	for (const k in predicateCases) {
		const subdiscriminant = discriminate(predicateCases[k])
		cases[k] = subdiscriminant ?? predicateCases[k]
	}
	const discriminant: Discriminant = {
		kind,
		path,
		cases,
		isPureRootLiteral: false
	}
	discriminantCache.set(branches, discriminant)
	return discriminant
}

// TODO: if deeply includes morphs?
export const writeUndiscriminableMorphUnionMessage = <path extends string>(
	path: path
) =>
	`${
		path === "/" ? "A" : `At ${path}, a`
	} union including one or more morphs must be discriminable`
