import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { dictionary, DynamicTypeName } from "../utils/dynamicTypes.js"
import type { mutable } from "../utils/generics.js"
import { hasKey, satisfies } from "../utils/generics.js"
import type {
    AssociativeType,
    Attribute,
    AttributeKey,
    AttributeOperations,
    DegenerateType,
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
    requiredKeys: keySetOperations,
    props: propsOperations,
    branches: branchOperations
})

type DynamicOperations = dictionary<{
    intersection: DynamicOperation
    difference: DynamicOperation
}>

type DynamicOperation = (a: any, b: any, scope: ScopeRoot) => any

export const intersection = (a: Type, b: Type, scope: ScopeRoot): Type =>
    a.degenerate
        ? degenerateIntersection(a, b, scope)
        : b.degenerate
        ? degenerateIntersection(b, a, scope)
        : associativeIntersection(a, b, scope)

const degenerateIntersection = (a: DegenerateType, b: Type, scope: ScopeRoot) =>
    a.degenerate === "alias"
        ? intersection(scope.resolve(a.name), b, scope)
        : a.degenerate === "unknown"
        ? b
        : a.degenerate === "never"
        ? a
        : b.degenerate === "never"
        ? b
        : a

const associativeIntersection = (
    a: AssociativeType,
    b: AssociativeType,
    scope: ScopeRoot
): Type => {
    const result: AssociativeType = {}
    let caseKey: DynamicTypeName
    for (caseKey in a) {
        if (hasKey(b, caseKey)) {
            const caseA: UnknownAttributes = a[caseKey]!
            const caseB: UnknownAttributes = b[caseKey]
            let caseResult: mutable<UnknownAttributes> | null = {
                ...caseA,
                ...caseB
            }
            let attributeKey: AttributeKey
            for (attributeKey in caseResult) {
                if (attributeKey in caseA && attributeKey in caseB) {
                    const fn = (operations as DynamicOperations)[attributeKey]
                        .intersection
                    const attributeResult = fn(
                        caseA[attributeKey],
                        caseB[attributeKey],
                        scope
                    )
                    if (attributeResult === null) {
                        caseResult = null
                        break
                    }
                    caseResult[attributeKey] = attributeResult
                }
            }
            if (caseResult !== null) {
                result[caseKey] = caseResult
            }
        }
    }
    return isEmpty(result)
        ? {
              degenerate: "never",
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
