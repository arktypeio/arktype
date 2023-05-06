import { inferred } from "../parse/definition.js"
import type { inferIn } from "../type.js"
import { throwParseError } from "../utils/errors.js"
import type { conform, exact } from "../utils/generics.js"
import type { List } from "../utils/lists.js"
import { wellFormedNonNegativeIntegerMatcher } from "../utils/numericLiterals.js"
import type { Basis } from "./basis.js"
import { BasisNode } from "./basis.js"
import type { CompilationState } from "./compilation.js"
import type { CaseKey, Discriminant, DiscriminantKind } from "./discriminate.js"
import { discriminate } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import type {
    ConstraintKind,
    inferPredicateDefinition,
    PredicateNodeInput
} from "./predicate.js"
import { PredicateNode, unknownPredicateNode } from "./predicate.js"
import { PropsNode } from "./props.js"

type inferBranches<branches extends TypeNodeInput> = {
    [i in keyof branches]: branches[i] extends PredicateNodeInput
        ? inferPredicateDefinition<branches[i]>
        : branches[i] extends PredicateNode<infer t>
        ? t
        : never
}[number]

export type TypeNodeInput = List<PredicateNodeInput>

type validateTypeNodeInput<
    branches extends TypeNodeInput,
    bases extends Basis[]
> = {
    [i in keyof branches]: exact<
        branches[i],
        PredicateNodeInput<bases[i & keyof bases]>
    >
}

type extractBases<branches, result extends Basis[] = []> = branches extends [
    infer head,
    ...infer tail
]
    ? extractBases<
          tail,
          [
              ...result,
              head extends {
                  basis: infer basis extends Basis
              }
                  ? basis
                  : Basis
          ]
      >
    : result

export class TypeNode<t = unknown> extends Node<"type", unknown, inferIn<t>> {
    declare [inferred]: t

    static readonly kind = "type"
    discriminant: Discriminant | null

    constructor(public branches: PredicateNode[]) {
        const discriminant = discriminate(branches)
        super(TypeNode, discriminant ?? branches)
        this.discriminant = discriminant
    }

    static from<branches extends TypeNodeInput>(
        ...branches: {
            [i in keyof branches]: conform<
                branches[i],
                validateTypeNodeInput<branches, extractBases<branches>>[i]
            >
        }
    ) {
        const branchNodes = branches.map((branch) =>
            branch instanceof PredicateNode
                ? branch
                : PredicateNode.from(branch as any)
        )
        const uniquenessByIndex: Record<number, boolean> = branchNodes.map(
            () => true
        )
        for (let i = 0; i < branchNodes.length; i++) {
            for (
                let j = i + 1;
                j < branchNodes.length && uniquenessByIndex[i];
                j++
            ) {
                if (!uniquenessByIndex[j]) {
                    continue
                }
                if (branchNodes[i] === branchNodes[j]) {
                    // if the two branches are equal, only "j" is marked as
                    // redundant so at least one copy could still be included in
                    // the final set of branches.
                    uniquenessByIndex[j] = false
                    continue
                }
                const intersection = branchNodes[i].intersect(branchNodes[j])
                if (intersection === branchNodes[i]) {
                    uniquenessByIndex[i] = false
                } else if (intersection === branchNodes[j]) {
                    uniquenessByIndex[j] = false
                }
            }
        }
        return new TypeNode<inferBranches<branches>>(
            branchNodes.filter((_, i) => uniquenessByIndex[i])
        )
    }

    static compile(branches: Discriminant | PredicateNode[]) {
        return Array.isArray(branches)
            ? TypeNode.#compileIndiscriminable(branches)
            : TypeNode.#compileSwitch(branches)
    }

    static #compileIndiscriminable(branches: PredicateNode[]) {
        return branches.length === 0
            ? "false"
            : branches.length === 1
            ? branches[0].key
            : `(${branches
                  .map((branch) => branch.key)
                  .sort()
                  .join(" || ")})`
    }

    static #compileSwitch(discriminant: Discriminant): string {
        // TODO: optional access
        const condition =
            discriminant.kind === "domain"
                ? `typeof ${discriminant.path}`
                : `${discriminant.path}`

        let compiledCases = ""
        let k: CaseKey
        for (k in discriminant.cases) {
            const caseCondition = k === "default" ? "default" : `case ${k}`
            const caseNode = discriminant.cases[k]
            compiledCases += `${caseCondition}: {
                return ${caseNode.key};
            }`
        }
        return `(() => {
        switch(${condition}) {
            ${compiledCases}
        }
    })()`
    }

    compileTraverse(s: CompilationState): string {
        switch (this.branches.length) {
            case 0:
                return "throw new Error();"
            case 1:
                return this.branches[0].compileTraverse(s)
            default:
                s.unionDepth++
                const result = `state.pushUnion();
                        ${this.branches
                            .map(
                                (rules) => `(() => {
                            ${rules.compileTraverse(s)}
                            })()`
                            )
                            .join(" && ")};
                        state.popUnion(${this.branches.length}, ${s.data}, ${
                    s.path.json
                });`
                s.unionDepth--
                return result
        }
    }

    getPath(...path: string[]) {
        let current: PredicateNode[] = this.branches
        let next: PredicateNode[] = []
        while (path.length) {
            const key = path.shift()!
            for (const branch of current) {
                const childrenAtKey =
                    branch.getConstraint("props")?.named?.[key]?.value.branches
                if (childrenAtKey) {
                    next.push(...childrenAtKey)
                }
            }
            current = next
            next = []
        }
        return TypeNode.from(...(current as any))
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind) {
        const prunedBranches: PredicateNode[] = []
        for (const branch of this.branches) {
            const pruned = branch.pruneDiscriminant(path, kind)
            prunedBranches.push(pruned)
        }
        return new TypeNode(prunedBranches)
    }

    static intersect(l: TypeNode, r: TypeNode): TypeNode | Disjoint {
        if (l === r) {
            return l
        }
        if (l.branches.length === 1 && r.branches.length === 1) {
            const result = l.branches[0].intersect(r.branches[0])
            return result instanceof Disjoint ? result : new TypeNode([result])
        }
        // Branches that are determined to be a subtype of an opposite branch are
        // guaranteed to be a member of the final reduced intersection, so long as
        // each individual set of branches has been correctly reduced to exclude
        // redundancies.
        const finalBranches: PredicateNode[] = []
        // Each rBranch is initialized to an empty array to which distinct
        // intersections will be appended. If the rBranch is identified as a
        // subtype or equal of any lBranch, the corresponding value should be
        // set to null so we can avoid including previous/future intersections
        // in the final result.
        const candidatesByR: (PredicateNode[] | null)[] = r.branches.map(
            () => []
        )
        for (let lIndex = 0; lIndex < l.branches.length; lIndex++) {
            const lBranch = l.branches[lIndex]
            let currentCandidateByR: { [rIndex in number]: PredicateNode } = {}
            for (let rIndex = 0; rIndex < r.branches.length; rIndex++) {
                const rBranch = r.branches[rIndex]
                if (!candidatesByR[rIndex]) {
                    // we've identified this rBranch as a subtype of
                    // an lBranch and will not yield any distinct intersections.
                    continue
                }
                if (lBranch === rBranch) {
                    // Combination of subtype and supertype cases
                    finalBranches.push(lBranch)
                    candidatesByR[rIndex] = null
                    currentCandidateByR = {}
                    break
                }
                const branchIntersection = lBranch.intersect(rBranch)
                if (branchIntersection instanceof Disjoint) {
                    // doesn't tell us about any redundancies or add a distinct intersection
                    continue
                }
                if (branchIntersection === lBranch) {
                    // If l is a subtype of the current r branch, intersections
                    // with previous and remaining branches of r won't lead to
                    // distinct intersections, so empty currentCandidatesByR and break
                    // from the inner loop.
                    finalBranches.push(lBranch)
                    currentCandidateByR = {}
                    break
                }
                if (branchIntersection === rBranch) {
                    // If r is a subtype of the current l branch, set its
                    // intersections to null, removing any previous
                    // intersections and preventing any of its
                    // remaining intersections from being computed.
                    finalBranches.push(rBranch)
                    candidatesByR[rIndex] = null
                    continue
                }
                // If neither l nor r is a subtype of the other, add their
                // intersection as a candidate to the current batch (could
                // still be removed if it is determined l or r is a subtype
                // of a remaining branch).
                currentCandidateByR[rIndex] = branchIntersection
            }
            for (const rIndex in currentCandidateByR) {
                // candidatesByR at rIndex should never be null if it is in currentCandidates
                candidatesByR[rIndex]!.push(currentCandidateByR[rIndex])
            }
        }
        // All remaining candidates are distinct, so include them in the final result
        for (const candidates of candidatesByR) {
            candidates?.forEach((candidate) => finalBranches.push(candidate))
        }
        return finalBranches.length
            ? new TypeNode(finalBranches)
            : Disjoint.from("union", l, r)
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: PredicateNodeInput[kind]
    ) {
        return new TypeNode(
            // TODO: nevers?
            this.branches.map((branch) => branch.constrain(kind, definition))
        )
    }

    and(other: TypeNode): TypeNode {
        const result = this.intersect(other)
        return result instanceof TypeNode
            ? result
            : throwParseError(`Unsatisfiable`)
    }

    or(other: TypeNode): TypeNode {
        if (this === other) {
            return this
        }
        return new TypeNode([...this.branches, ...other.branches])
    }

    get valueNode(): BasisNode<"value"> | undefined {
        return this.branches.length === 1
            ? this.branches[0].valueNode
            : undefined
    }

    equals<other>(other: TypeNode<other>): this is TypeNode<other> {
        return this === (other as unknown)
    }

    extends<other>(other: TypeNode<other>): this is TypeNode<other> {
        return this.intersect(other) === this
    }

    keyOf() {
        // const predicateKeys = keysOf(node).map((domain) =>
        //     keysOfPredicate(domain, node[domain]!)
        // )
        // const sharedKeys = sharedKeysOf(predicateKeys)

        // if (!sharedKeys.length) {
        //     return writeImplicitNeverMessage(ctx.path, "keyof")
        // }

        // const keyBranches: ConstraintsNode[] = []

        // for (const key of sharedKeys) {
        //     const keyType = typeof key
        //     if (
        //         keyType === "string" ||
        //         keyType === "number" ||
        //         keyType === "symbol"
        //     ) {
        //         keyBranches.push(ConstraintsNode.from({ value: key }))
        //     } else if (key === wellFormedNonNegativeIntegerMatcher) {
        //         keyBranches.push(arrayIndexStringBranch, arrayIndexNumberBranch)
        //     } else {
        //         return throwInternalError(
        //             `Unexpected keyof key '${stringify(key)}'`
        //         )
        //     }
        // }

        return this
    }

    toArray(): TypeNode<t[]> {
        const props = new PropsNode([{}, [[arrayIndexTypeNode, this]]])
        const predicate = new PredicateNode({
            basis: arrayBasisNode,
            constraints: [props]
        })
        return new TypeNode([predicate])
    }
}

export const arrayBasisNode = new BasisNode(Array)

export const arrayIndexTypeNode = TypeNode.from({
    basis: "string",
    regex: wellFormedNonNegativeIntegerMatcher.source
})

// TODO: fix TypeNode autocomplete
export const numericArrayIndexTypeNode = TypeNode.from({
    basis: "number",
    divisor: 1,
    range: {
        ">=": 0
    }
})

export const neverTypeNode = new TypeNode([])

export const unknownTypeNode = new TypeNode([unknownPredicateNode])
