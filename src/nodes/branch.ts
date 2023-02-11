import { writeImplicitNeverMessage } from "../parse/ast/intersection.js"
import type { Morph } from "../parse/ast/morph.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, hasDomain } from "../utils/domains.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type { CollapsibleList, Dict, List } from "../utils/generics.js"
import type { IntersectionState, Intersector } from "./compose.js"
import { isDisjoint, isEquality } from "./compose.js"
import type { FlattenContext } from "./node.js"
import type { PredicateComparison } from "./predicate.js"
import type { Rules } from "./rules/rules.js"
import { flattenRules, rulesIntersection } from "./rules/rules.js"

export type Branch<domain extends Domain = Domain, $ = Dict> =
    | Rules<domain, $>
    | MorphBranch<domain, $>

export type MorphBranch<domain extends Domain = Domain, $ = Dict> = {
    rules: Rules<domain, $>
    morph: CollapsibleList<Morph>
}

export type Branches = List<Branch>

export type MorphEntry = ["morph", Morph]

export const isBranchComparison = (
    comparison: PredicateComparison
): comparison is BranchesComparison =>
    (comparison as BranchesComparison)?.lBranches !== undefined

export type BranchesComparison = {
    lBranches: Branches
    rBranches: Branches
    lExtendsR: number[]
    rExtendsL: number[]
    equalities: [lIndex: number, rIndex: number][]
    distinctIntersections: Branches
}

export const compareBranches = (
    lConditions: Branches,
    rConditions: Branches,
    state: IntersectionState
): BranchesComparison => {
    const result: BranchesComparison = {
        lBranches: lConditions,
        rBranches: rConditions,
        lExtendsR: [],
        rExtendsL: [],
        equalities: [],
        distinctIntersections: []
    }
    const pairs = rConditions.map((condition) => ({
        condition,
        distinct: [] as Branch[] | null
    }))
    lConditions.forEach((l, lIndex) => {
        let lImpliesR = false
        const distinct = pairs.map((rPairs, rIndex): Branch | null => {
            if (lImpliesR || !rPairs.distinct) {
                return null
            }
            const r = rPairs.condition
            const subresult = branchIntersection(l, r, state)
            if (isDisjoint(subresult)) {
                // doesn't tell us about any redundancies or add a distinct pair
                return null
            } else if (subresult === l) {
                result.lExtendsR.push(lIndex)
                // If l is a subtype of the current r branch, intersections
                // with the remaining branches of r won't lead to distinct
                // branches, so we set a flag indicating we can skip them.
                lImpliesR = true
                return null
            } else if (subresult === r) {
                result.rExtendsL.push(rIndex)
                // If r is a subtype of the current l branch, it is removed
                // from pairsByR because future intersections won't lead to
                // distinct branches.
                rPairs.distinct = null
                return null
            } else if (isEquality(subresult)) {
                // Combination of l and r subtype cases.
                result.equalities.push([lIndex, rIndex])
                lImpliesR = true
                rPairs.distinct = null
                return null
            } else if (hasDomain(subresult, "object")) {
                // Neither branch is a subtype of the other, return
                // the result of the intersection as a candidate
                // branch for the final union
                return subresult
            }
            return throwInternalError(
                `Unexpected predicate intersection result of type '${domainOf(
                    subresult
                )}'`
            )
        })
        if (!lImpliesR) {
            for (let i = 0; i < pairs.length; i++) {
                if (distinct[i]) {
                    pairs[i].distinct?.push(distinct[i]!)
                }
            }
        }
    })
    result.distinctIntersections = pairs.flatMap(
        (pairs) => pairs.distinct ?? []
    )
    return result
}

export const isMorphBranch = (branch: Branch): branch is MorphBranch =>
    "morph" in branch

export const flattenBranch = (branch: Branch, ctx: FlattenContext) => {
    if (isMorphBranch(branch)) {
        const result = flattenRules(branch.rules, ctx)
        if (branch.morph) {
            if (typeof branch.morph === "function") {
                result.push(["morph", branch.morph])
            } else {
                for (const morph of branch.morph) {
                    result.push(["morph", morph])
                }
            }
        }
        return result
    }
    return flattenRules(branch, ctx)
}

const rulesOf = (branch: Branch): Rules =>
    (branch as MorphBranch).rules ?? branch

export const branchIntersection: Intersector<Branch> = (l, r, state) => {
    const lRules = rulesOf(l)
    const rRules = rulesOf(r)
    const rulesResult = rulesIntersection(lRules, rRules, state)
    if ("morph" in l) {
        if ("morph" in r) {
            if (l.morph === r.morph) {
                return isEquality(rulesResult) || isDisjoint(rulesResult)
                    ? rulesResult
                    : {
                          rules: rulesResult,
                          morph: l.morph
                      }
            }
            return state.lastOperator === "&"
                ? throwParseError(
                      writeImplicitNeverMessage(
                          state.path,
                          "Intersection",
                          "of morphs"
                      )
                  )
                : {}
        }
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  rules: isEquality(rulesResult) ? l.rules : rulesResult,
                  morph: l.morph
              }
    }
    if ("morph" in r) {
        return isDisjoint(rulesResult)
            ? rulesResult
            : {
                  rules: isEquality(rulesResult) ? r.rules : rulesResult,
                  morph: r.morph
              }
    }
    return rulesResult
}
