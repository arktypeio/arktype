import { throwInternalError } from "../../../utils/errors.js"
import { ClassNode } from "../../basis/class.js"
import type { PredicateInput } from "../../predicate.js"
import { nonVariadicArrayIndexTypeNode, TypeNode } from "../../type.js"

const arrayIndexMatcherSuffix = `(?:0|(?:[1-9]\\d*))$`

type ArrayIndexMatcherSource = `${string}${typeof arrayIndexMatcherSuffix}`

const excludedIndexMatcherStart = "^(?!("
const excludedIndexMatcherEnd = ")$)"

// Build a pattern to exclude all indices from firstVariadic - 1 down to 0
const excludedIndicesSource = (firstVariadic: number) => {
    if (firstVariadic < 1) {
        return throwInternalError(
            `Unexpectedly tried to create a variadic index < 1 (was ${firstVariadic})`
        )
    }
    let excludedIndices = `${firstVariadic - 1}`
    for (let i = firstVariadic - 2; i >= 0; i--) {
        excludedIndices += `|${i}`
    }
    return `${excludedIndexMatcherStart}${excludedIndices}${excludedIndexMatcherEnd}${arrayIndexMatcherSuffix}` as const
}

export type VariadicIndexMatcherSource = ReturnType<
    typeof excludedIndicesSource
>

const nonVariadicIndexMatcherSource = `^${arrayIndexMatcherSuffix}` as const

export type NonVariadicIndexMatcherSource = typeof nonVariadicIndexMatcherSource

export const createArrayIndexMatcher = <index extends number>(
    firstVariadic: index
) =>
    (firstVariadic === 0
        ? // If the variadic pattern starts at index 0, return the base array index matcher
          nonVariadicIndexMatcherSource
        : excludedIndicesSource(firstVariadic)) as index extends 0
        ? NonVariadicIndexMatcherSource
        : VariadicIndexMatcherSource

export const extractArrayIndexRegex = (keyNode: TypeNode<string>) => {
    if (keyNode.rule.length !== 1) {
        return
    }
    const regexNode = keyNode.rule[0].getConstraint("regex")
    if (!regexNode || regexNode.rule.length !== 1) {
        return
    }
    const source = regexNode.rule[0]
    if (!source.endsWith(arrayIndexMatcherSuffix)) {
        return
    }
    return source as ArrayIndexMatcherSource
}

// const extractFirstVariadicIndex = (source: ArrayIndexMatcherSource) => {
//     if (!source.startsWith(excludedIndexMatcherStart)) {
//         return 0
//     }
//     const excludedIndices = source.slice(
//         excludedIndexMatcherStart.length,
//         source.indexOf(excludedIndexMatcherEnd)
//     )
//     const firstExcludedIndex = excludedIndices.split("|")[0]
//     return (
//         tryParseWellFormedInteger(
//             firstExcludedIndex,
//             `Unexpectedly failed to parse a variadic index from ${source}`
//         ) + 1
//     )
// }

export const arrayBasisNode = new ClassNode(Array)

export const arrayIndexInput = <index extends number = 0>(
    firstVariadicIndex: index = 0 as index
) =>
    ({
        basis: "string",
        regex: createArrayIndexMatcher(firstVariadicIndex)
    } as const satisfies PredicateInput<"string">)

export const arrayIndexTypeNode = (firstVariadicIndex = 0) =>
    firstVariadicIndex === 0
        ? nonVariadicArrayIndexTypeNode
        : TypeNode.from(arrayIndexInput(firstVariadicIndex))
