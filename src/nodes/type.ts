import { inferred } from "../parse/definition.js"
import type { inferIn } from "../type.js"
import { throwParseError } from "../utils/errors.js"
import type { conform, exact } from "../utils/generics.js"
import type { List } from "../utils/lists.js"
import { isArray } from "../utils/objectKinds.js"
import type { Basis } from "./basis/basis.js"
import { BasisNode } from "./basis/basis.js"
import { ValueNode } from "./basis/value.js"
import type { CompilationState } from "./compilation.js"
import { createArrayIndexMatcher, PropsNode } from "./constraints/props.js"
import type { CaseKey, Discriminant, DiscriminantKind } from "./discriminate.js"
import { discriminate } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import type {
    ConstraintKind,
    inferPredicateDefinition,
    PredicateInput
} from "./predicate.js"
import { PredicateNode, unknownPredicateNode } from "./predicate.js"

type inferBranches<branches extends BranchesInput> = {
    [i in keyof branches]: inferPredicateDefinition<branches[i]>
}[number]

export type inferTypeInput<input extends TypeInput> = inferPredicateDefinition<
    input extends BranchesInput ? input[number] : input
>

export type BranchesInput = List<PredicateInput>

export type TypeInput = PredicateInput | BranchesInput

type validatedTypeNodeInput<
    branches extends BranchesInput,
    bases extends Basis[]
> = {
    [i in keyof branches]: exact<
        branches[i],
        PredicateInput<bases[i & keyof bases]>
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

    static from<branches extends BranchesInput>(
        ...branches: {
            [i in keyof branches]: conform<
                branches[i],
                validatedTypeNodeInput<branches, extractBases<branches>>[i]
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

    static fromValue<branches extends readonly unknown[]>(
        ...branches: branches
    ) {
        const seen: unknown[] = []
        const nodes: PredicateNode[] = []
        for (const v of branches) {
            if (!seen.includes(v)) {
                nodes.push(new PredicateNode([new ValueNode(v)]))
                seen.push(v)
            }
        }
        return new TypeNode<branches[number]>(nodes)
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
            ? branches[0].condition
            : `(${branches
                  .map((branch) => branch.condition)
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
                return ${caseNode.condition};
            }`
        }
        return `(() => {
        switch(${condition}) {
            ${compiledCases}
        }
    })()`
    }

    toString() {
        return this.branches.length === 0
            ? "never"
            : this.branches.map((branch) => branch.toString()).join(" or ")
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

    getPath(...path: (string | TypeNode<string>)[]) {
        let current: PredicateNode[] = this.branches
        let next: PredicateNode[] = []
        while (path.length) {
            const key = path.shift()!
            for (const branch of current) {
                const propsAtKey = branch.getConstraint("props")
                if (propsAtKey) {
                    const branchesAtKey =
                        typeof key === "string"
                            ? propsAtKey.named?.[key]?.value.branches
                            : propsAtKey.indexed.find(
                                  (entry) => entry[0] === key
                              )?.[1].branches
                    if (branchesAtKey) {
                        next.push(...branchesAtKey)
                    }
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
        definition: PredicateInput[kind]
    ) {
        return new TypeNode(
            this.branches.map((branch) => branch.constrain(kind, definition))
        )
    }

    and<other>(other: TypeNode<other>): TypeNode<t & other> {
        const result = this.intersect(other)
        return result instanceof Disjoint
            ? result.throw()
            : (result as TypeNode<t & other>)
    }

    or<other>(other: TypeNode<other>): TypeNode<t | other> {
        if (this === (other as unknown)) {
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

    private _keyof?: TypeNode
    keyof(): TypeNode {
        if (this.branches.length === 0) {
            return throwParseError(`never is not a valid keyof operand`)
        }
        if (this._keyof) {
            return this._keyof
        }
        this._keyof = this.branches[0].keyof()
        for (let i = 1; i < this.branches.length; i++) {
            this._keyof = this._keyof.and(this.branches[i].keyof())
        }
        return this._keyof
    }

    array(): TypeNode<t[]> {
        const props = new PropsNode({}, [[nonVariadicArrayIndexTypeNode, this]])
        const predicate = new PredicateNode([arrayBasisNode, props])
        return new TypeNode([predicate])
    }
}

export const typeNodeFromInput = (input: TypeInput) =>
    isArray(input) ? TypeNode.from(...input) : TypeNode.from(input)

export const arrayBasisNode = new BasisNode(Array)

export const arrayIndexInput = (firstVariadicIndex = 0) =>
    ({
        basis: "string",
        regex: createArrayIndexMatcher(firstVariadicIndex)
    } as const satisfies PredicateInput<"string">)

const nonVariadicArrayIndexTypeNode = TypeNode.from(arrayIndexInput())

export const arrayIndexTypeNode = (firstVariadicIndex = 0) =>
    firstVariadicIndex === 0
        ? nonVariadicArrayIndexTypeNode
        : TypeNode.from(arrayIndexInput(firstVariadicIndex))

export const neverTypeNode = new TypeNode([])

export const unknownTypeNode = new TypeNode([unknownPredicateNode])
