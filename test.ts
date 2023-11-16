/* eslint-disable @typescript-eslint/no-restricted-imports */
// import { isDeepStrictEqual } from "util"
// import { type Dict } from "./ark/util/main.ts"
// import { node } from "./ark/schema/main.ts"
// import { wellFormedNumberMatcher } from "./ark/util/main.ts"

import { isDeepStrictEqual } from "util"
import type { NodeKind } from "./ark/schema/shared/define.ts"
import type { Schema } from "./ark/schema/shared/node.ts"
import type { Dict } from "./ark/util/records.ts"

class Foo<schema extends Schema<kind>, kind extends NodeKind> {
	constructor(schema: schema) {}
}

const z = new Foo({ domain: "string" }) //?

// const parseNumber2 = node({
// 	basis: "string",
// 	pattern: wellFormedNumberMatcher,
// 	description: "a well-formed numeric string"
// })

// console.log(parseNumber2.description)

// parseNumber2.constraints[0].implicitBasis //?

// // parseNumber2
// const parseNumber = node(
// 	{
// 		in: {
// 			basis: "string",
// 			pattern: wellFormedNumberMatcher,
// 			description: "a well-formed numeric string"
// 		},
// 		morph: (s: string) => parseFloat(s)
// 	},
// 	"number"
// )

// parseNumber.description //?

// parseNumber.in.description //?

// parseNumber.out.description //?

// parseNumber.out.json //?

export const intersectBranches = (
	l: readonly Dict[],
	r: readonly Dict[],
	ordered = false
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
			if (branchIntersection === null) {
				// Doesn't tell us anything useful about their relationships
				// with other branches
				continue
			}
			if (isDeepStrictEqual(branchIntersection, l[lIndex])) {
				// If the current l branch is a subtype of r, intersections
				// with previous and remaining branches of r won't lead to
				// distinct intersections.
				batchesByR[rIndex]!.push(l[lIndex])
				candidatesByR = {}
				break
			}
			if (isDeepStrictEqual(branchIntersection, r[rIndex])) {
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
	return batchesByR.flatMap((batch, i) => batch ?? r[i]) as never
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
	[{ c: 3 }, { d: 4 }],
	[{ b: 2, c: 3 }, { b: 2 }, { f: 2 }]
) //?
