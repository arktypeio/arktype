import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { TypeConfig } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { CollapsibleList, Dict } from "../utils/generics.ts"
import type { Rules } from "./rules/rules.ts"
import { rulesIntersection } from "./rules/rules.ts"

export type Branch<domain extends Domain = Domain, $ = Dict> =
    | Rules<domain, $>
    | MetaBranch<domain, $>

export type MetaBranch<domain extends Domain = Domain, $ = Dict> = {
    rules: Rules<domain, $>
    morph?: CollapsibleList<Morph>
    config?: TypeConfig
}

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
