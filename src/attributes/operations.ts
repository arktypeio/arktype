import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import { hasKey, satisfies } from "../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    AttributeOperations,
    CaseKey,
    CaselessType,
    Cases,
    Type,
    UnknownAttributes
} from "./attributes.js"
import { bounds } from "./bounds.js"
import { branchOperations } from "./branches.js"
import { divisor } from "./divisor.js"
import { keySetOperations } from "./keySets.js"
import { propsOperations, requiredOperations } from "./props.js"

export const operations = satisfies<{
    [k in AttributeKey]: AttributeOperations<Attribute<k>>
}>()({
    bounds,
    divisor,
    required: requiredOperations,
    regex: keySetOperations,
    contradiction: keySetOperations,
    props: propsOperations,
    branches: branchOperations
})

type DynamicOperations = dictionary<{
    intersection: DynamicOperation
    difference: DynamicOperation
}>

type DynamicOperation = (a: any, b: any, scope: ScopeRoot) => any

export const intersection = (a: Type, b: Type, scope: ScopeRoot): Type => {
    if (a.caseless) {
        return caselessIntersection(a, b, scope)
    }
    if (b.caseless) {
        return caselessIntersection(b, a, scope)
    }
    return casesIntersection(a, b, scope)
}

const caselessIntersection = (a: CaselessType, b: Type, scope: ScopeRoot) => {
    if (a.caseless === "alias") {
        return intersection(scope.resolve(a.name), b, scope)
    } else if (a.caseless === "always") {
        return a.keyword === "any" ? a : b
    } else {
        return a
    }
}

const casesIntersection = (a: Cases, b: Cases, scope: ScopeRoot): Type => {
    const result: Cases = {}
    let caseKey: CaseKey
    for (caseKey in a) {
        if (hasKey(b, caseKey)) {
            const caseA: UnknownAttributes = a[caseKey]!
            const caseB: UnknownAttributes = b[caseKey]
            const caseResult: UnknownAttributes = {}
            let attributeKey: AttributeKey
            for (attributeKey in a[caseKey]) {
                if (hasKey(b[caseKey], attributeKey)) {
                    const fn = (operations as DynamicOperations)[attributeKey]
                        .intersection
                    const caseResult = fn(
                        caseA[attributeKey],
                        caseB[attributeKey],
                        scope
                    )
                    if (caseResult !== null) {
                        caseResult[attributeKey] = caseResult
                    }
                }
            }
            if (!isEmpty(caseResult)) {
                result[caseKey] = caseResult
            }
        }
    }
    return isEmpty(result)
        ? {
              caseless: "never",
              // TODO: Delegate based on k
              reason: `${JSON.stringify(a)} and ${JSON.stringify(
                  b
              )} have no overlap`
          }
        : result
}

// export const difference = (a: Type, b: Type, scope: ScopeRoot) => {
//     a = expandIfAlias(a, scope)
//     b = expandIfAlias(b, scope)
//     const result: mutable<Attributes> = {}
//     let k: AttributeKey
//     for (k in a) {
//         if (k in b) {
//             const fn = operations[k].difference as DynamicOperation
//             result[k] = fn(a[k], b[k], scope)
//             if (result[k] === null) {
//                 delete result[k]
//             }
//         } else {
//             result[k] = a[k] as any
//         }
//     }
//     return isEmpty(result) ? null : result
// }

// export const isSubtype = (a: Type, b: Type, scope: ScopeRoot) =>
//     difference(b, a, scope) === null
