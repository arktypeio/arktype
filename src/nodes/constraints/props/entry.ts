import { throwInternalError } from "../../../utils/errors.js"
import { tryParseWellFormedInteger } from "../../../utils/numericLiterals.js"
import { compilePropAccess, In, IndexIn } from "../../compilation.js"
import { Disjoint } from "../../disjoint.js"
import { defineNode } from "../../node.js"
import type { PredicateInput } from "../../predicate.js"
import type { TypeInput, TypeNode } from "../../type.js"
import { neverTypeNode } from "../../type.js"

export type PropsChildren = [NamedNodes, ...IndexedNodeEntry[]]

export class EntryNode extends defineNode<PropsChildren>()({
    kind: "entry",
    condition: (n) => {
        indexed.sort((l, r) => (l[0].condition >= r[0].condition ? 1 : -1))
        const condition = PropsNode.compile(sortedNamedEntries, indexed)
        super("props", condition)
        this.namedEntries = sortedNamedEntries
    },
    describe: (n) => `props`,
    intersect: (l, r) => {}
}) {
    private static compileNamedEntry(entry: NamedNodeEntry) {
        const valueCheck = entry[1].value.condition.replaceAll(
            In,
            `${In}${compilePropAccess(entry[0])}`
        )
        return entry[1].kind === "optional"
            ? `!('${entry[0]}' in ${In}) || ${valueCheck}`
            : valueCheck
    }

    private static compileIndexedEntry(entry: IndexedNodeEntry) {
        const indexMatcher = extractArrayIndexRegex(entry[0])
        if (indexMatcher) {
            return PropsNode.compileArrayElementsEntry(indexMatcher, entry[1])
        }
        return throwInternalError(`Unexpected index type ${entry[0].condition}`)
    }

    private static compileArrayElementsEntry(
        indexMatcher: ArrayIndexMatcherSource,
        valueNode: TypeNode
    ) {
        const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
        const elementCondition = valueNode.condition
            .replaceAll(IndexIn, `${IndexIn}Inner`)
            .replaceAll(In, `${In}[${IndexIn}]`)
        const result = `(() => {
        let valid = true;
        for(let ${IndexIn} = ${firstVariadicIndex}; ${IndexIn} < ${In}.length; ${IndexIn}++) {
            valid = ${elementCondition} && valid;
        }
        return valid
    })()`
        return result
    }

    private intersectNamedProp(
        name: string,
        r: NamedNode
    ): NamedNode | Disjoint {
        const l = this.named[name]
        const kind =
            l.kind === "prerequisite" || r.kind === "prerequisite"
                ? "prerequisite"
                : l.kind === "required" || r.kind === "required"
                ? "required"
                : "optional"
        const result = l.value.intersect(r.value)
        if (result instanceof Disjoint) {
            if (kind === "optional") {
                return {
                    kind: "optional",
                    value: neverTypeNode
                }
            }
            return result
        }
        return {
            kind,
            value: result
        }
    }
}

const precedenceByPropKind = {
    prerequisite: 0,
    required: 1,
    optional: 2
} satisfies Record<PropKind, number>

// TODO: standardize entry
export type NamedValueInput = {
    kind: PropKind
    value: TypeInput
}

export type NamedPropsInput = Record<string, NamedValueInput>

export type NamedNode = {
    kind: PropKind
    value: TypeNode
}

export type NamedNodeEntry = [key: string, value: NamedNode]

export type NamedNodes = Record<string, NamedNode>

export type IndexedInputEntry = readonly [
    keyType: PredicateInput<"string">,
    valueType: TypeInput
]

export type IndexedNodeEntry = [keyType: TypeNode<string>, valueType: TypeNode]

export type PropKind = "required" | "optional" | "prerequisite"

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

type VariadicIndexMatcherSource = ReturnType<typeof excludedIndicesSource>

const nonVariadicIndexMatcherSource = `^${arrayIndexMatcherSuffix}` as const

type NonVariadicIndexMatcherSource = typeof nonVariadicIndexMatcherSource

export const createArrayIndexMatcher = <index extends number>(
    firstVariadic: index
) =>
    (firstVariadic === 0
        ? // If the variadic pattern starts at index 0, return the base array index matcher
          nonVariadicIndexMatcherSource
        : excludedIndicesSource(firstVariadic)) as index extends 0
        ? NonVariadicIndexMatcherSource
        : VariadicIndexMatcherSource

const extractArrayIndexRegex = (keyNode: TypeNode<string>) => {
    if (keyNode.rule.length !== 1) {
        return
    }
    const regexNode = keyNode.rule[0].getConstraint("regex")
    if (!regexNode || regexNode.children.length !== 1) {
        return
    }
    const source = regexNode.children[0]
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
