/* eslint-disable @typescript-eslint/no-restricted-imports */
import { isDeepStrictEqual } from "util"
import { type Dict } from "./ark/util/main.js"

const intersectBranches = (
	l: readonly Dict[],
	r: readonly Dict[]
): readonly Dict[] => {
	// If the corresponding r branch is identified as a subtype of an l branch, the
	// value at rIndex is set to null so we can avoid including previous/future
	// inersections in the reduced result.
	const batchesByR: (Dict[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		let candidatesByR: { [rIndex: number]: Dict } = {}
		for (let rIndex = 0; rIndex < r.length; rIndex++) {
			if (batchesByR[rIndex] === null) {
				// rBranch is a subtype of an lBranch and
				// will not yield any distinct intersection
				continue
			}
			if (isDeepStrictEqual(l[lIndex], r[rIndex])) {
				// Combination of subtype and supertype cases
				batchesByR[rIndex] = null
				candidatesByR = {}
				break
			}
			const branchIntersection = intersect(l[lIndex], r[rIndex])
			if (isDeepStrictEqual(branchIntersection, l[lIndex])) {
				// If l is a subtype of the current r branch, intersections
				// with previous and remaining branches of r won't lead to
				// distinct intersections.
				batchesByR[rIndex]!.push(l[lIndex])
				candidatesByR = {}
				break
			}
			if (isDeepStrictEqual(branchIntersection, r[rIndex])) {
				// If r is a subtype of the current l branch, set its
				// intersections to null, removing any previous
				// intersections and preventing any of its
				// remaining intersections from being computed.
				batchesByR[rIndex] = null
			} else if (branchIntersection !== null) {
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
	// All remaining candidates are distinct, so include them in the final result
	return batchesByR.flatMap((batch, i) => batch ?? [r[i]])
}

const intersect = (l: Dict, r: Dict) => {
	const result = { ...l, ...r }
	for (const k in result) {
		if (k in l && k in r && l[k] !== r[k]) {
			return null
		}
	}
	return result
}

const result = intersectBranches(
	[{ a: 1 }, { c: 3 }, { b: 2 }, { d: 4, e: 5 }],
	[{ b: 2 }, { c: 3, f: 6 }, { d: 4 }, { g: 7 }]
) //?
