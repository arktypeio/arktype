import { compilePropAccess, In } from "../../compilation.js"
import { BaseNode } from "../../node.js"
import type { PredicateInput } from "../../predicate.js"
import type { TypeInput, TypeNode } from "../../type.js"

export type PropsChildren = [NamedNodes, ...IndexedNodeEntry[]]
// ({
//     kind: "entry",
//     condition: (n) => {
//         indexed.sort((l, r) => (l[0].condition >= r[0].condition ? 1 : -1))
//         const condition = PropsNode.compile(sortedNamedEntries, indexed)
//         super("props", condition)
//         this.namedEntries = sortedNamedEntries
//     },
//     describe: (n) => `props`,
//     intersect: (l, r) => {}
// })

export class EntryNode extends BaseNode<typeof EntryNode> {
    static readonly kind = "entry"

    static compile(entry: unknown) {
        return entry ? [] : []
    }

    computeIntersection(other: EntryNode) {
        return other ? this : this
    }

    toString() {
        return ""
    }

    private static compileNamedEntry(entry: NamedNodeEntry) {
        const valueCheck = entry[1].value.condition.replaceAll(
            In,
            `${In}${compilePropAccess(entry[0])}`
        )
        return entry[1].kind === "optional"
            ? `!('${entry[0]}' in ${In}) || ${valueCheck}`
            : valueCheck
    }

    // private static compileIndexedEntry(entry: IndexedNodeEntry) {
    //     const indexMatcher = extractArrayIndexRegex(entry[0])
    //     if (indexMatcher) {
    //         return PropsNode.compileArrayElementsEntry(indexMatcher, entry[1])
    //     }
    //     return throwInternalError(`Unexpected index type ${entry[0].condition}`)
    // }

    // private static compileArrayElementsEntry(
    //     indexMatcher: ArrayIndexMatcherSource,
    //     valueNode: TypeNode
    // ) {
    //     const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
    //     const elementCondition = valueNode.condition
    //         .replaceAll(IndexIn, `${IndexIn}Inner`)
    //         .replaceAll(In, `${In}[${IndexIn}]`)
    //     const result = `(() => {
    //     let valid = true;
    //     for(let ${IndexIn} = ${firstVariadicIndex}; ${IndexIn} < ${In}.length; ${IndexIn}++) {
    //         valid = ${elementCondition} && valid;
    //     }
    //     return valid
    // })()`
    //     return result
    // }

    // private intersectNamedProp(
    //     name: string,
    //     r: NamedNode
    // ): NamedNode | Disjoint {
    //     const l = this.named[name]
    //     const kind =
    //         l.kind === "prerequisite" || r.kind === "prerequisite"
    //             ? "prerequisite"
    //             : l.kind === "required" || r.kind === "required"
    //             ? "required"
    //             : "optional"
    //     const result = l.value.intersect(r.value)
    //     if (result instanceof Disjoint) {
    //         if (kind === "optional") {
    //             return {
    //                 kind: "optional",
    //                 value: neverTypeNode
    //             }
    //         }
    //         return result
    //     }
    //     return {
    //         kind,
    //         value: result
    //     }
    // }
}

// const precedenceByPropKind = {
//     prerequisite: 0,
//     required: 1,
//     optional: 2
// } satisfies Record<PropKind, number>

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
