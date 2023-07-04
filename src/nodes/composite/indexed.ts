import {
    throwInternalError,
    tryParseWellFormedInteger
} from "../../../dev/utils/src/main.js"
import {
    type CompilationContext,
    InputParameterName
} from "../../compile/compile.js"
import { sourceFromRegexLiteral } from "../primitive/regex.js"
import type { NamedPropRule } from "./named.js"
import { compileNamedProp, compileNamedProps } from "./named.js"
import type { PredicateInput } from "./predicate.js"
import type { TypeInput, TypeNode } from "./type.js"
import { builtins, node } from "./type.js"

export type IndexedPropInput = Readonly<{
    key: TypeInput
    value: TypeInput
}>

export type IndexedPropRule = Readonly<{
    key: TypeNode
    value: TypeNode
}>

const arrayIndexSourceSuffix = `(?:0|(?:[1-9]\\d*))$`

const arrayIndexLiteralSuffix = `${arrayIndexSourceSuffix}/` as const

export type ArrayIndexMatcherSource =
    `${string}${typeof arrayIndexSourceSuffix}`

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
    return `${excludedIndexMatcherStart}${excludedIndices}${excludedIndexMatcherEnd}${arrayIndexSourceSuffix}` as const
}

export type VariadicIndexMatcherSource = ReturnType<
    typeof excludedIndicesSource
>

export type VariadicIndexMatcherLiteral = `/${VariadicIndexMatcherSource}/`

const nonVariadicIndexMatcherSource = `^${arrayIndexSourceSuffix}` as const

export type NonVariadicIndexMatcherSource = typeof nonVariadicIndexMatcherSource

export type NonVariadicIndexMatcherLiteral =
    `/${NonVariadicIndexMatcherSource}/`

export const arrayIndexMatcherSource = <index extends number>(
    firstVariadic: index
) =>
    (firstVariadic === 0
        ? // If the variadic pattern starts at index 0, return the base array index matcher
          nonVariadicIndexMatcherSource
        : excludedIndicesSource(firstVariadic)) as index extends 0
        ? NonVariadicIndexMatcherSource
        : VariadicIndexMatcherSource

export const extractArrayIndexRegex = (keyNode: TypeNode) => {
    if (keyNode.branches.length !== 1) {
        return
    }
    const regexNode = keyNode.branches[0].getConstraint("regex")
    if (!regexNode || regexNode.rule.length !== 1) {
        return
    }
    const regexLiteral = regexNode.rule[0]
    if (!regexLiteral.endsWith(arrayIndexLiteralSuffix)) {
        return
    }
    return sourceFromRegexLiteral(regexLiteral) as ArrayIndexMatcherSource
}

export const extractFirstVariadicIndex = (source: ArrayIndexMatcherSource) => {
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

export const arrayIndexInput = <index extends number = 0>(
    firstVariadicIndex: index = 0 as index
) =>
    ({
        basis: "string",
        regex: `/${arrayIndexMatcherSource(firstVariadicIndex)}/`
    } as const satisfies PredicateInput<"string">)

export const arrayIndexTypeNode = (firstVariadicIndex = 0): TypeNode<string> =>
    firstVariadicIndex === 0
        ? builtins.nonVariadicArrayIndex()
        : node(arrayIndexInput(firstVariadicIndex))

export const compileArray = (
    indexMatcher: ArrayIndexMatcherSource,
    elementNode: TypeNode,
    namedProps: NamedPropRule[],
    ctx: CompilationContext
) => {
    const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
    const namedCheck = namedProps
        .map((named) => compileNamedProp(named, ctx))
        .join("\n")
    ctx.path.push(["i"])
    const elementCondition = `${elementNode.alias}(${InputParameterName}[i])`
    ctx.path.pop()
    return `${namedCheck}
for(let i = ${firstVariadicIndex}; i < ${InputParameterName}.length; i++) {
    ${elementCondition}
}`
}

export const compileIndexed = (
    namedProps: NamedPropRule[],
    indexedProps: IndexedPropRule[],
    ctx: CompilationContext
) => {
    throw new Error()
    const k = ctx.path.push(["k"])
    const indexedChecks = indexedProps
        .map((prop) =>
            prop.key === builtins.string()
                ? // if the index signature is just for "string", we don't need to check it explicitly
                  prop.value.compile(ctx)
                : // Ensure condition is checked on the key variable as opposed to the input
                  // TODO: fix ${prop.key.condition.replaceAll(InputParameterName, k)}
                  `if(false){
    ${prop.value.compile(ctx)}
}`
        )
        .join("\n")
    ctx.path.pop()
    // TODO: don't recheck named
    return `${compileNamedProps(namedProps, ctx)}
    for(const ${k} in ${InputParameterName}) {
        ${indexedChecks}
    }
`
}
