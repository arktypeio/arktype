import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { HomogenousTuple } from "../utils/lists.js"
import { tryParseWellFormedInteger } from "../utils/numericLiterals.js"
import type { Key, mutable } from "../utils/records.js"
import { hasKeys } from "../utils/records.js"
import {
    type CompilationState,
    compilePropAccess,
    In,
    IndexIn
} from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import type { DisjointsSources } from "./disjoint.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import type { PredicateInput } from "./predicate.js"
import type { inferTypeInput, TypeInput } from "./type.js"
import {
    neverTypeNode,
    TypeNode,
    typeNodeFromInput,
    unknownTypeNode
} from "./type.js"

export class PropsNode extends Node<"props"> {
    static readonly kind = "props"

    keyNames: string[]
    named: NamedNodes
    indexed: IndexedNodeEntry[]

    // TODO: Switch to namedNodeEntries so can preserve sorted order
    constructor([named, indexed]: [
        named: NamedNodes,
        indexed: IndexedNodeEntry[]
    ]) {
        // Sort keys first by precedence (prerequisite,required,optional),
        // then alphebetically by name (bar, baz, foo)
        const sortedKeyNames = Object.keys(named).sort((l, r) => {
            const lPrecedence = precedenceByPropKind[named[l].kind]
            const rPrecedence = precedenceByPropKind[named[r].kind]
            return lPrecedence > rPrecedence
                ? 1
                : lPrecedence < rPrecedence
                ? -1
                : l > r
                ? 1
                : -1
        })
        // TODO: this is a lie because of numeric keys
        // JS objects preserve insertion order, so we can count on iterating
        // over the keys in the same order.
        const sortedNamed: mutable<NamedNodes> = {}
        for (const k of sortedKeyNames) {
            sortedNamed[k] = named[k]
        }
        const sortedIndexed = [...indexed].sort((l, r) =>
            l[0].key >= r[0].key ? 1 : -1
        )
        super(PropsNode, sortedNamed, sortedIndexed)
        this.keyNames = sortedKeyNames
        this.named = sortedNamed
        this.indexed = sortedIndexed
    }

    static from(namedInput: NamedInput, ...indexedInput: IndexedInputEntry[]) {
        const named = {} as mutable<NamedNodes>
        for (const k in namedInput) {
            named[k] = {
                kind: namedInput[k].kind,
                value: typeNodeFromInput(namedInput[k].value)
            }
        }
        const indexed: IndexedNodeEntry[] = indexedInput.map(
            ([keyInput, valueInput]) => [
                TypeNode.from(keyInput),
                typeNodeFromInput(valueInput)
            ]
        )
        return new PropsNode([named, indexed])
    }

    static compile(named: NamedNodes, indexed: IndexedNodeEntry[]) {
        const checks: string[] = []
        for (const k in named) {
            checks.push(PropsNode.#compileNamedProp(k, named[k]))
        }
        for (const entry of indexed) {
            checks.push(PropsNode.#compileIndexedEntry(entry))
        }
        return checks.join(" && ") || "true"
    }

    static #compileNamedProp(k: string, prop: NamedNode) {
        const valueCheck = prop.value.key.replaceAll(
            In,
            `${In}${compilePropAccess(k)}`
        )
        return prop.kind === "optional"
            ? `!('${k}' in ${In}) || ${valueCheck}`
            : valueCheck
    }

    static #compileIndexedEntry(entry: IndexedNodeEntry) {
        const keySource = extractIndexKeyRegex(entry[0])
        if (!keySource) {
            // we only handle array indices for now
            return throwInternalError(`Unexpected index type ${entry[0].key}`)
        }
        const firstVariadicIndex = extractFirstVariadicIndex(keySource)
        const elementCondition = entry[1].key
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

    compileTraverse(s: CompilationState) {
        return this.keyNames
            .map((k) =>
                this.named[k].value
                    .compileTraverse(s)
                    .replaceAll(In, `${In}${compilePropAccess(k)}`)
            )
            .join("\n")
    }

    static intersect(l: PropsNode, r: PropsNode) {
        let indexed = [...l.indexed]
        for (const [rKey, rValue] of r.indexed) {
            const matchingIndex = indexed.findIndex(([lKey]) => lKey === rKey)
            if (matchingIndex === -1) {
                indexed.push([rKey, rValue])
            } else {
                const result = indexed[matchingIndex][1].intersect(rValue)
                indexed[matchingIndex][1] =
                    result instanceof Disjoint ? neverTypeNode : result
            }
        }
        const named = { ...l.named, ...r.named }
        const disjointsByPath: DisjointsSources = {}
        for (const k in named) {
            // TODO: not all discriminatable- if one optional and one required, even if disjoint
            let intersectedValue: NamedNode | Disjoint = named[k]
            if (k in l.named) {
                if (k in r.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    intersectedValue = PropsNode.#intersectNamedProp(
                        l.named[k],
                        r.named[k]
                    )
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const [rKey, rValue] of r.indexed) {
                        if (rKey.allows(k)) {
                            intersectedValue = PropsNode.#intersectNamedProp(
                                l.named[k],
                                {
                                    kind: "optional",
                                    value: rValue
                                }
                            )
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const [lKey, lValue] of l.indexed) {
                    if (lKey.allows(k)) {
                        intersectedValue = PropsNode.#intersectNamedProp(
                            r.named[k],
                            {
                                kind: "optional",
                                value: lValue
                            }
                        )
                    }
                }
            }
            if (intersectedValue instanceof Disjoint) {
                Object.assign(
                    disjointsByPath,
                    intersectedValue.withPrefixKey(k).sources
                )
            } else {
                named[k] = intersectedValue
            }
        }
        if (hasKeys(disjointsByPath)) {
            return new Disjoint(disjointsByPath)
        }
        if (named.length?.kind === "prerequisite") {
            // if the index key is from and unbounded array and we have a tuple length,
            // it has already been intersected and should be removed
            indexed = indexed.filter((entry) => !extractIndexKeyRegex(entry[0]))
        }
        return new PropsNode([named, indexed])
    }

    static #intersectNamedProp(
        l: NamedNode,
        r: NamedNode
    ): NamedNode | Disjoint {
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

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PropsNode {
        const [key, ...nextPath] = path
        const propAtKey = this.named[key]
        const prunedValue = propAtKey.value.pruneDiscriminant(nextPath, kind)
        const { [key]: _, ...preserved } = this.named
        if (prunedValue !== unknownTypeNode) {
            preserved[key] = {
                kind: propAtKey.kind,
                value: prunedValue
            }
        }
        return new PropsNode([preserved, this.indexed])
    }
}

const precedenceByPropKind = {
    prerequisite: 0,
    required: 1,
    optional: 2
} satisfies Record<PropKind, number>

export const emptyPropsNode = new PropsNode([{}, []])

export type PropsInput = NamedInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedInput = NamedInput,
    indexed extends IndexedInputEntry[] = IndexedInputEntry[]
> = [named: named, ...indexed: indexed]

export type NamedPropInput = {
    kind: PropKind
    value: TypeInput
}

export type NamedInput = Record<string, NamedPropInput>

export type NamedNode = {
    kind: PropKind
    value: TypeNode
}

export type NamedNodes = Record<string, NamedNode>

export type IndexedInputEntry = [
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

const nonVariadicIndexMatcherSource = `^${arrayIndexMatcherSuffix}` as const

export const createArrayIndexMatcher = (firstVariadic = 0) => {
    if (firstVariadic === 0) {
        // If the variadic pattern starts at index 0, return the base array index matcher
        return nonVariadicIndexMatcherSource
    }
    return excludedIndicesSource(firstVariadic)
}

const extractIndexKeyRegex = (keyNode: TypeNode<string>) => {
    if (keyNode.branches.length !== 1) {
        return
    }
    const regexNode = keyNode.branches[0].getConstraint("regex")
    if (!regexNode || regexNode.sources.length !== 1) {
        return
    }
    const source = regexNode.sources[0]
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

type inferNamedProps<input extends NamedInput> = {} extends input
    ? unknown
    : // Avoid iterating over prototype keys of tuple
    [keyof input, input] extends ["length", TupleLengthProps]
    ? unknown
    : evaluate<
          {
              [k in requiredKeyOf<input>]: inferTypeInput<input[k]["value"]>
          } & {
              [k in optionalKeyOf<input>]?: inferTypeInput<input[k]["value"]>
          }
      >

type TupleLengthProps<length extends number = number> = {
    length: {
        kind: "prerequisite"
        value: { basis: ["===", length] }
    }
}

export type inferPropsInput<input extends PropsInput> =
    input extends PropsInputTuple<infer named, infer indexed>
        ? inferNamedAndIndexed<named, indexed>
        : input extends NamedInput
        ? inferNamedProps<input>
        : never

type inferNamedAndIndexed<
    named extends NamedInput,
    entries extends unknown[],
    result = inferNamedProps<named>
> = entries extends [infer entry extends IndexedInputEntry, ...infer tail]
    ? inferNamedAndIndexed<
          named,
          tail,
          result &
              (entry[0] extends { regex: ArrayIndexMatcherSource }
                  ? inferArray<named, entry[1]>
                  : Record<
                        Extract<inferTypeInput<entry[0]>, Key>,
                        inferTypeInput<entry[1]>
                    >)
      >
    : result

type inferArray<
    named extends NamedInput,
    elementDef extends TypeInput
> = named extends TupleLengthProps<infer length>
    ? HomogenousTuple<inferTypeInput<elementDef>, length>
    : inferTypeInput<elementDef>[]

type requiredKeyOf<input extends NamedInput> = Exclude<
    keyof input,
    optionalKeyOf<input>
>

type optionalKeyOf<input extends NamedInput> = {
    [k in keyof input]: input[k]["kind"] extends "optional" ? k : never
}[keyof input]

// const keysOfPredicate = (kind: Domain, predicate: Predicate) =>
//     domain !== "object" || predicate === true
//         ? baseKeysByDomain[domain]
//         : sharedKeysOf(
//               listFrom(predicate).map((branch) => keysOfObjectBranch(branch))
//           )

// const sharedKeysOf = (keyBranches: List<KeyValue>[]): List<KeyValue> => {
//     if (!keyBranches.length) {
//         return []
//     }
//     let sharedKeys = keyBranches[0]
//     for (let i = 1; i < keyBranches.length; i++) {
//         // we can filter directly by equality here because the RegExp we're
//         // using will always be reference equal to
//         // wellFormedNonNegativeIntegerMatcher
//         sharedKeys = sharedKeys.filter((k) => keyBranches[i].includes(k))
//     }
//     return sharedKeys
// }

// const keysOfObjectBranch = (branch: BranchDefinition<"object">): KeyValue[] => {
//     const result: KeyValue[] = []
//     if ("props" in branch) {
//         for (const key of Object.keys(branch.props)) {
//             if (key === mappedKeys.index) {
//                 // if any number is a valid key push this RegExp
//                 result.push(wellFormedNonNegativeIntegerMatcher)
//             } else if (!result.includes(key)) {
//                 result.push(key)
//                 if (wellFormedNonNegativeIntegerMatcher.test(key)) {
//                     // allow numeric access to keys
//                     result.push(
//                         tryParseWellFormedInteger(
//                             key,
//                             `Unexpectedly failed to parse an integer from key '${key}'`
//                         )
//                     )
//                 }
//             }
//         }
//     }
//     if ("instance" in branch) {
//         for (const key of prototypeKeysOf(branch.instance.prototype)) {
//             if (!result.includes(key)) {
//                 result.push(key)
//             }
//         }
//     }
//     return result
// }
