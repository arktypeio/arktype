import { In, IndexIn, KeyIn } from "../../../compile/compile.js"
import { throwInternalError } from "../../../utils/errors.js"
import { cached } from "../../../utils/functions.js"
import { tryParseWellFormedInteger } from "../../../utils/numericLiterals.js"
import { ClassNode } from "../../basis/class.js"
import type { PredicateInput } from "../../predicate.js"
import type { TypeInput, TypeNode } from "../../type.js"
import { node, nonVariadicArrayIndexTypeNode } from "../../type.js"
import type { NamedPropRule } from "./named.js"
import { compileNamedProps } from "./named.js"

export const compileNamedAndIndexedProps = (
    named: NamedPropRule[],
    indexed: IndexedPropRule[]
) => {
    if (indexed.length === 1) {
        // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
        const indexMatcher = extractArrayIndexRegex(indexed[0].key)
        if (indexMatcher) {
            return compileArray(indexMatcher, indexed[0].value, named)
        }
    }
    return compileNonArray(named, indexed)
}

const compileArray = (
    indexMatcher: ArrayIndexMatcherSource,
    elementNode: TypeNode,
    namedProps: NamedPropRule[]
) => {
    const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
    const namedCheck = compileNamedProps(namedProps)
    const elementCondition = elementNode.condition
        .replaceAll(IndexIn, `${IndexIn}Inner`)
        .replaceAll(In, `${In}[${IndexIn}]`)
    // TODO: don't recheck named
    const result = `(() => {
    let valid = ${namedCheck};
    for(let ${IndexIn} = ${firstVariadicIndex}; ${IndexIn} < ${In}.length; ${IndexIn}++) {
        valid = ${elementCondition} && valid;
    }
    return valid
})()`
    return result
}

const compileNonArray = (
    namedProps: NamedPropRule[],
    indexedProps: IndexedPropRule[]
) => {
    const namedCheck = compileNamedProps(namedProps)
    const indexedChecks = indexedProps.map(compileIndexedProp).join("\n")
    // TODO: don't recheck named
    return `(() => {
    let valid = ${namedCheck};
    for(const ${KeyIn} in ${In}) {
        ${indexedChecks}
    }
    return valid
})()`
}

const compileIndexedProp = (prop: IndexedPropRule) => {
    const valueCheck = `valid = ${prop.value.condition
        .replaceAll(KeyIn, `${KeyIn}Inner`)
        .replaceAll(In, `${In}[${KeyIn}]`)} && valid`
    if (prop.key === getStringNode()) {
        // if the index signature is just for "string", we don't need to check it explicitly
        return valueCheck
    }
    return `if(${prop.key.condition
        .replaceAll(KeyIn, `${KeyIn}Inner`)
        .replaceAll(In, KeyIn)}) {
        ${valueCheck}
    }`
}

export type IndexedPropInput = {
    key: PredicateInput<"string">
    value: TypeInput
}

export type IndexedPropRule = {
    key: TypeNode
    value: TypeNode
}

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

export const extractArrayIndexRegex = (keyNode: TypeNode) => {
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

const extractFirstVariadicIndex = (source: ArrayIndexMatcherSource) => {
    if (!source.startsWith(excludedIndexMatcherStart)) {
        return 0
    }
    const excludedIndices = source.slice(
        excludedIndexMatcherStart.length,
        source.indexOf(excludedIndexMatcherEnd)
    )
    const firstExcludedIndex = excludedIndices.split("|")[0]
    return (
        tryParseWellFormedInteger(
            firstExcludedIndex,
            `Unexpectedly failed to parse a variadic index from ${source}`
        ) + 1
    )
}

export const arrayBasisNode = ClassNode(Array)

export const getStringNode = cached(() => node({ basis: "string" }))

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
        : node(arrayIndexInput(firstVariadicIndex))
