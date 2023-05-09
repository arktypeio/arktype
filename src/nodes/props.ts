import { throwInternalError, throwParseError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import { type HomogenousTuple, type listable } from "../utils/lists.js"
import { tryParseWellFormedInteger } from "../utils/numericLiterals.js"
import { isArray } from "../utils/objectKinds.js"
import type { Key } from "../utils/records.js"
import { hasKeys } from "../utils/records.js"
import {
    type CompilationState,
    compilePropAccess,
    compileSerializedValue,
    In,
    IndexIn
} from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import type { DisjointsSources } from "./disjoint.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import { type PredicateInput } from "./predicate.js"
import type { inferTypeInput, TypeInput } from "./type.js"
import { neverTypeNode, TypeNode, unknownTypeNode } from "./type.js"

export class PropsNode extends Node<"props"> {
    static readonly kind = "props"

    entries: NodeEntry[]
    named: Record<string | symbol, NamedNodeEntry>
    indexed: IndexedNodeEntry[]

    constructor(entries: NodeEntry[]) {
        // Sort keys first by precedence (prerequisite,required,optional),
        // then alphebetically by name (bar, baz, foo)
        const sortedEntries = [...entries].sort((l, r) => {
            const lPrecedence = precedenceByPropKind[l.kind]
            const rPrecedence = precedenceByPropKind[r.kind]
            return lPrecedence > rPrecedence
                ? 1
                : lPrecedence < rPrecedence
                ? -1
                : l > r
                ? 1
                : -1
        })
        super(PropsNode, sortedEntries)
        this.entries = sortedEntries
        this.named = {}
        this.indexed = []
        for (const entry of sortedEntries) {
            if (entry.kind === "indexed") {
                this.indexed.push(entry)
            } else {
                const name = entry.key.literalValue as string | symbol
                this.named[name] = entry
            }
        }
    }

    static from(...entries: InputEntry[]) {
        return new PropsNode(
            entries.map((entry) => {
                const keyInput: TypeInput = isArray(entry.key)
                    ? entry.key
                    : [
                          typeof entry.key === "object"
                              ? entry.key
                              : { basis: ["===", entry.key] }
                      ]
                const valueInput: TypeInput = isArray(entry.value)
                    ? entry.value
                    : [entry.value]
                return {
                    key: TypeNode.from(...keyInput) as TypeNode<Key>,
                    value: TypeNode.from(...valueInput),
                    kind: entry.kind
                }
            })
        )
    }

    static compile(entries: NodeEntry[]) {
        if (entries.length === 0) {
            return "true"
        }
        const hasIndexed = entries.at(-1)!.kind === "indexed"
        return hasIndexed ? throwParseError("no") : this.#compileNamed(entries)
    }

    static #compileNamed(entries: NodeEntry[]) {
        return entries
            .map((entry) => {
                const key = entry.key.literalValueNode!.getLiteralValue() as Key
                const serializedKey =
                    typeof key === "symbol" ? compileSerializedValue(key) : key
                const valueCheck = entry.value.key.replaceAll(
                    In,
                    `${In}${compilePropAccess(serializedKey)}`
                )
                return entry.kind === "optional"
                    ? `!(${
                          typeof key === "symbol"
                              ? serializedKey
                              : `'${serializedKey}'`
                      } in ${In}) || ${valueCheck}`
                    : valueCheck
            })
            .join(" && ")
    }

    static #compileIndexedEntry(entry: NodeEntry) {
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
        const result: NodeEntry[] = [...l.indexed]
        for (const rEntry of r.indexed) {
            const matchingLIndex = l.indexed.findIndex(
                (lEntry) => lEntry.key === rEntry.key
            )
            if (matchingLIndex === -1) {
                result.push(rEntry)
            } else {
                const signatureResult = result[matchingLIndex].value.intersect(
                    rEntry.value
                )
                result[matchingLIndex].value =
                    signatureResult instanceof Disjoint
                        ? neverTypeNode
                        : signatureResult
            }
        }
        const named = { ...l.named, ...r.named }
        const disjointsByPath: DisjointsSources = {}
        for (const k in named) {
            // TODO: not all discriminatable- if one optional and one required, even if disjoint
            let nameResult: NamedNodeEntry | Disjoint = named[k]
            if (k in l.named) {
                if (k in r.named) {
                    // We assume l and r were properly created and the named
                    // props from each PropsNode have already been intersected
                    // with any matching index props. Therefore, the
                    // intersection result will already include index values
                    // from both sides whose key types allow k.
                    nameResult = PropsNode.#intersectNamed(
                        l.named[k].key,
                        l.named[k],
                        r.named[k]
                    )
                } else {
                    // If a named key from l matches any index keys of r, intersect
                    // the value associated with the name with the index value.
                    for (const rEntry of r.indexed) {
                        if (rEntry.key.allows(k)) {
                            nameResult = PropsNode.#intersectNamed(
                                l.named[k].key,
                                l.named[k],
                                rEntry
                            )
                        }
                    }
                }
            } else {
                // If a named key from r matches any index keys of l, intersect
                // the value associated with the name with the index value.
                for (const lEntry of l.indexed) {
                    if (lEntry.key.allows(k)) {
                        nameResult = PropsNode.#intersectNamed(
                            r.named[k].key,
                            r.named[k],
                            lEntry
                        )
                    }
                }
            }
            if (nameResult instanceof Disjoint) {
                Object.assign(
                    disjointsByPath,
                    nameResult.withPrefixKey(k).sources
                )
            } else {
                result.push(nameResult)
            }
        }
        if (hasKeys(disjointsByPath)) {
            return new Disjoint(disjointsByPath)
        }
        // if (named.length?.kind === "prerequisite") {
        //     // if the index key is from and unbounded array and we have a tuple length,
        //     // it has already been intersected and should be removed
        //     indexed = indexed.filter((entry) => !extractIndexKeyRegex(entry[0]))
        // }
        return new PropsNode(result)
    }

    static #intersectNamed<l extends NodeEntry, r extends NodeEntry>(
        key: TypeNode<Key>,
        l: l,
        r: r
    ): NamedNodeEntry | Disjoint {
        const kind: PropKind =
            l.kind === "prerequisite" || r.kind === "prerequisite"
                ? "prerequisite"
                : l.kind === "required" || r.kind === "required"
                ? "required"
                : l.kind === "optional" || r.kind === "optional"
                ? "optional"
                : throwInternalError(
                      `Unexpected intersection of two index entries`
                  )
        const value = l.value.intersect(r.value)
        if (value instanceof Disjoint) {
            if (kind === "optional") {
                return {
                    key,
                    value: neverTypeNode,
                    kind
                }
            }
            return value.withPrefixKey(key.literalValue as Key)
        }
        return {
            key,
            value,
            kind
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

    keyOf() {
        // TODO: numeric?
        return [...this.keyNames, ...this.indexed.map((entry) => entry[0])]
    }
}

const precedenceByPropKind = {
    prerequisite: 0,
    required: 1,
    optional: 2,
    indexed: 3
} satisfies Record<PropKind, number>

type DisjointEntry = [key: Key, disjoint: Disjoint]

export const emptyPropsNode = new PropsNode([])

export type PropsInput = NamedInput | PropsInputTuple

export type PropsInputTuple<
    named extends NamedInput = NamedInput,
    indexed extends IndexedInputEntry[] = IndexedInputEntry[]
> = [named: named, ...indexed: indexed]

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

export type KeyInput = string | number | symbol | TypeInput

export type InputEntry = NamedPropInput | IndexedPropInput

export type NamedPropInput = {
    key: string | number | symbol
    value: TypeInput
    kind: NamedPropKind
}

export type IndexedPropInput = {
    key: listable<PredicateInput<"string" | "number" | "symbol">>
    value: TypeInput
    kind: "indexed"
}

export type KeyNode = TypeNode<string | number | symbol>

export type NamedNodeEntry = {
    key: KeyNode
    value: TypeNode
    kind: NamedPropKind
}

export type IndexedNodeEntry = {
    key: KeyNode
    value: TypeNode
    kind: "indexed"
}

export type NodeEntry = NamedNodeEntry | IndexedNodeEntry

type NamedPropKind = "prerequisite" | "required" | "optional"

export type PropKind = NamedPropKind | "indexed"

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
