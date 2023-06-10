import type { inferred } from "../parse/definition.js"
import type { conform, exact } from "../utils/generics.js"
import { isArray } from "../utils/objectKinds.js"
import type { BasisInput } from "./basis/basis.js"
import { ValueNode } from "./basis/value.js"
import {
    arrayBasisNode,
    arrayIndexInput,
    arrayIndexTypeNode
} from "./constraints/props/indexed.js"
import { PropsNode } from "./constraints/props/props.js"
import type { Discriminant } from "./discriminate.js"
import { discriminate } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import type { Node } from "./node.js"
import { defineNodeKind } from "./node.js"
import type {
    ConstraintKind,
    inferPredicateDefinition,
    PredicateInput
} from "./predicate.js"
import {
    parsePredicateNode,
    PredicateNode,
    unknownPredicateNode
} from "./predicate.js"

// Need an interface to use `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface TypeNode<t = unknown>
    extends Node<{
        kind: "type"
        rule: PredicateNode[]
        intersected: TypeNode
    }> {
    [inferred]: t
    discriminant: Discriminant | undefined
    valueNode: ValueNode | undefined
    array(): TypeNode<t[]>
    isNever(): this is TypeNode<never>
    isUnknown(): this is TypeNode<unknown>
    and<other>(other: TypeNode<other>): TypeNode<t & other>
    or<other>(other: TypeNode<other>): TypeNode<t | other>
    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: PredicateInput[kind]
    ): TypeNode<t>
    equals<other>(other: TypeNode<other>): this is TypeNode<other>
    extends<other>(other: TypeNode<other>): this is TypeNode<t & other>
    keyof(): TypeNode<keyof t>
    getPath(...path: (string | TypeNode<string>)[]): TypeNode
}

export const TypeNode = defineNodeKind<TypeNode>(
    {
        kind: "type",
        compile: (rule) => {
            const condition = compileIndiscriminable(rule.sort())
            return condition
        },
        intersect: (l, r): TypeNode | Disjoint => {
            if (l.rule.length === 1 && r.rule.length === 1) {
                const result = l.rule[0].intersect(r.rule[0])
                return result instanceof Disjoint ? result : TypeNode([result])
            }
            const resultBranches = intersectBranches(l.rule, r.rule)
            return resultBranches.length
                ? TypeNode(resultBranches)
                : Disjoint.from("union", l, r)
        }
    },
    (base) => ({
        description:
            base.rule.length === 0
                ? "never"
                : base.rule.map((branch) => branch.toString()).join(" or "),
        discriminant: discriminate(base.rule),
        valueNode: base.rule.length === 1 ? base.rule[0].valueNode : undefined,
        array(): any {
            const props = PropsNode([
                { key: arrayIndexTypeNode(), value: this }
            ])
            const predicate = PredicateNode([arrayBasisNode, props])
            return TypeNode([predicate])
        },
        isNever() {
            return this.rule.length === 0
        },
        isUnknown() {
            return this.rule.length === 1 && this.rule[0].rule.length === 0
        },
        and(other): any {
            const result = this.intersect(other as never)
            return result instanceof Disjoint ? result.throw() : result
        },
        or(other): any {
            if (this === (other as unknown)) {
                return this
            }
            return TypeNode(reduceBranches([...this.rule, ...other.rule]))
        },
        constrain(kind, def): any {
            return TypeNode(
                this.rule.map((branch) => branch.constrain(kind, def))
            )
        },
        equals(other) {
            return this === other
        },
        extends(other) {
            return this.intersect(other as never) === this
        },
        keyof(): any {
            return this
        },
        getPath(...path): any {
            let current: PredicateNode[] = this.rule
            let next: PredicateNode[] = []
            while (path.length) {
                const key = path.shift()!
                for (const branch of current) {
                    const propsAtKey = branch.getConstraint("props")
                    if (propsAtKey) {
                        const branchesAtKey =
                            typeof key === "string"
                                ? propsAtKey.byName?.[key]?.value.rule
                                : propsAtKey.indexed.find(
                                      (entry) => entry.key === key
                                  )?.value.rule
                        if (branchesAtKey) {
                            next.push(...branchesAtKey)
                        }
                    }
                }
                current = next
                next = []
            }
            return TypeNode(current)
        }
    })
)

const intersectBranches = (
    l: PredicateNode[],
    r: PredicateNode[]
): PredicateNode[] => {
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
    const candidatesByR: (PredicateNode[] | null)[] = r.map(() => [])
    for (let lIndex = 0; lIndex < l.length; lIndex++) {
        const lBranch = l[lIndex]
        let currentCandidateByR: { [rIndex in number]: PredicateNode } = {}
        for (let rIndex = 0; rIndex < r.length; rIndex++) {
            const rBranch = r[rIndex]
            if (!candidatesByR[rIndex]) {
                // we've identified rBranch as a subtype of
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
    return finalBranches
}

const compileIndiscriminable = (branches: PredicateNode[]) => {
    return branches.length === 0
        ? "false"
        : branches.length === 1
        ? branches[0].condition
        : `(${branches
              .map((branch) => branch.condition)
              .sort()
              .join(" || ")})`
}

// const compileSwitch = (discriminant: Discriminant): string => {
//     const compiledPath = compilePathAccess(discriminant.path, {
//         optional: true
//     })
//     const condition =
//         discriminant.kind === "domain" ? `typeof ${compiledPath}` : compiledPath
//     let compiledCases = ""
//     let k: CaseKey
//     for (k in discriminant.cases) {
//         const caseCondition = k === "default" ? "default" : `case ${k}`
//         const caseNode = discriminant.cases[k]
//         compiledCases += `${caseCondition}: {
//             return ${caseNode.rule};
//         }`
//     }
//     return `(() => {
//     switch(${condition}) {
//         ${compiledCases}
//     }
// })()`
// }

// const compileTraverse = (s: CompilationState): string => {
//     switch (this.rule.length) {
//         case 0:
//             return "throw new Error();"
//         case 1:
//             return this.rule[0].compileTraverse(s)
//         default:
//             s.unionDepth++
//             const result = `state.pushUnion();
//                     ${this.rule
//                         .map(
//                             (rules) => `(() => {
//                         ${rules.compileTraverse(s)}
//                         })()`
//                         )
//                         .join(" && ")};
//                     state.popUnion(${this.rule.length}, ${s.data}, ${
//                 s.path.json
//             });`
//             s.unionDepth--
//             return result
//     }
// }

const reduceBranches = (branchNodes: PredicateNode[]) => {
    if (branchNodes.length < 2) {
        return branchNodes
    }
    const uniquenessByIndex: Record<number, boolean> = branchNodes.map(
        () => true
    )
    for (let i = 0; i < branchNodes.length; i++) {
        for (
            let j = i + 1;
            j < branchNodes.length &&
            uniquenessByIndex[i] &&
            uniquenessByIndex[j];
            j++
        ) {
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
    return branchNodes.filter((_, i) => uniquenessByIndex[i])
}

// function pruneDiscriminant(path: string[], kind: DiscriminantKind) {
//     const prunedBranches: PredicateNode[] = []
//     for (const branch of this.rule) {
//         const pruned = branch.pruneDiscriminant(path, kind)
//         prunedBranches.push(pruned)
//     }
//     return new TypeNode(prunedBranches)
// }

export type TypeNodeParser = {
    <const branches extends readonly PredicateInput[]>(
        ...branches: {
            [i in keyof branches]: conform<
                branches[i],
                validatedTypeNodeInput<branches, extractBases<branches>>[i]
            >
        }
    ): TypeNode<inferBranches<branches>>

    fromValues<const branches extends readonly unknown[]>(
        ...branches: branches
    ): TypeNode<branches[number]>
}

export const node: TypeNodeParser = Object.assign(
    (...branches: PredicateInput[]) => parseTypeNode(branches),
    {
        fromValues: (...branches: unknown[]) => typeNodeFromValues(branches)
    }
) as never

export const parseTypeNode = (input: TypeInput) =>
    isArray(input)
        ? TypeNode(
              reduceBranches(input.map((branch) => parsePredicateNode(branch)))
          )
        : TypeNode([parsePredicateNode(input)])

export const typeNodeFromValues = (branches: readonly unknown[]) => {
    const seen: unknown[] = []
    const nodes: PredicateNode[] = []
    for (const v of branches) {
        if (!seen.includes(v)) {
            nodes.push(PredicateNode([ValueNode(v)]))
            seen.push(v)
        }
    }
    return TypeNode(nodes)
}

export type inferBranches<branches extends readonly PredicateInput[]> = {
    [i in keyof branches]: inferPredicateDefinition<branches[i]>
}[number]

export type inferTypeInput<input extends TypeInput> = inferPredicateDefinition<
    input extends unknown[] ? input[number] : input
>

export type TypeInput = PredicateInput | PredicateInput[]

export type validatedTypeNodeInput<
    branches extends readonly PredicateInput[],
    bases extends BasisInput[]
> = {
    [i in keyof branches]: exact<
        branches[i],
        PredicateInput<bases[i & keyof bases]>
    >
}

export type extractBases<
    branches,
    result extends BasisInput[] = []
> = branches extends [infer head, ...infer tail]
    ? extractBases<
          tail,
          [
              ...result,
              head extends {
                  basis: infer basis extends BasisInput
              }
                  ? basis
                  : BasisInput
          ]
      >
    : result

export const neverTypeNode = TypeNode([])

export const unknownTypeNode = TypeNode([unknownPredicateNode])

export const nonVariadicArrayIndexTypeNode = node(arrayIndexInput())
