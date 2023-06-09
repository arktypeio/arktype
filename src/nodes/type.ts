import type { exact } from "../utils/generics.js"
import type { List } from "../utils/lists.js"
import { isArray } from "../utils/objectKinds.js"
import type { BasisInput } from "./basis/basis.js"
import type { Discriminant } from "./discriminate.js"
import { discriminate } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import type { Node } from "./node.js"
import { defineNodeKind } from "./node.js"
import type {
    inferPredicateDefinition,
    PredicateInput,
    PredicateNode
} from "./predicate.js"

export type TypeNode = Node<{
    kind: "type"
    rule: PredicateNode[]
    discriminant: Discriminant | undefined
}>

export const TypeNode = defineNodeKind<TypeNode>({
    kind: "type",
    compile: (rule) => {
        const condition = compileIndiscriminable(rule.sort())
        return condition
    },
    extend: (base) => ({
        discriminant: discriminate(base.rule),
        valueNode: base.rule.length === 1 ? base.rule[0].valueNode : undefined
    }),
    intersect: (l, r): TypeNode | Disjoint => {
        if (l.rule.length === 1 && r.rule.length === 1) {
            const result = l.rule[0].intersect(r.rule[0])
            return result instanceof Disjoint ? result : TypeNode([result])
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
        const candidatesByR: (PredicateNode[] | null)[] = r.rule.map(() => [])
        for (let lIndex = 0; lIndex < l.rule.length; lIndex++) {
            const lBranch = l.rule[lIndex]
            let currentCandidateByR: { [rIndex in number]: PredicateNode } = {}
            for (let rIndex = 0; rIndex < r.rule.length; rIndex++) {
                const rBranch = r.rule[rIndex]
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
        return finalBranches.length
            ? TypeNode(finalBranches)
            : Disjoint.from("union", l, r)
    },
    describe: (node) =>
        node.rule.length === 0
            ? "never"
            : node.rule.map((branch) => branch.toString()).join(" or ")
})

const compileIndiscriminable = (branches: PredicateNode[]) => {
    return branches.length === 0
        ? "false"
        : branches.length === 1
        ? branches[0].condition
        : `(${branches
              .map((branch) => branch.rule)
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

//     static from<const branches extends BranchesInput>(
//         ...branches: {
//             [i in keyof branches]: conform<
//                 branches[i],
//                 validatedTypeNodeInput<branches, extractBases<branches>>[i]
//             >
//         }
//     ): TypeNode<inferBranches<branches>> {
//         return TypeNode.fromDynamic(...branches) as never
//     }

//     static fromDynamic(...branches: BranchesInput): TypeNode<unknown> {
//         return new TypeNode(
//             this.reduceBranches(
//                 branches.map((branch) => PredicateNode.from(branch as never))
//             )
//         )
//     }

// const reduceBranches = (branchNodes: PredicateNode[]) => {
//     const uniquenessByIndex: Record<number, boolean> = branchNodes.map(
//         () => true
//     )
//     for (let i = 0; i < branchNodes.length; i++) {
//         for (
//             let j = i + 1;
//             j < branchNodes.length &&
//             uniquenessByIndex[i] &&
//             uniquenessByIndex[j];
//             j++
//         ) {
//             if (branchNodes[i] === branchNodes[j]) {
//                 // if the two branches are equal, only "j" is marked as
//                 // redundant so at least one copy could still be included in
//                 // the final set of branches.
//                 uniquenessByIndex[j] = false
//                 continue
//             }
//             const intersection = branchNodes[i].intersect(branchNodes[j])
//             if (intersection === branchNodes[i]) {
//                 uniquenessByIndex[i] = false
//             } else if (intersection === branchNodes[j]) {
//                 uniquenessByIndex[j] = false
//             }
//         }
//     }
//     return branchNodes.filter((_, i) => uniquenessByIndex[i])
// }

// function getPath(node: TypeNode, ...path: (string | TypeNode<string>)[]) {
//     let current: PredicateNode[] = this.rule
//     let next: PredicateNode[] = []
//     while (path.length) {
//         const key = path.shift()!
//         for (const branch of current) {
//             const propsAtKey = branch.getConstraint("props")
//             if (propsAtKey) {
//                 const branchesAtKey =
//                     typeof key === "string"
//                         ? propsAtKey.byName?.[key]?.value.rule
//                         : propsAtKey.indexed.find((entry) => entry.key === key)
//                               ?.value.rule
//                 if (branchesAtKey) {
//                     next.push(...branchesAtKey)
//                 }
//             }
//         }
//         current = next
//         next = []
//     }
//     return TypeNode.from(...(current as any))
// }

// function pruneDiscriminant(path: string[], kind: DiscriminantKind) {
//     const prunedBranches: PredicateNode[] = []
//     for (const branch of this.rule) {
//         const pruned = branch.pruneDiscriminant(path, kind)
//         prunedBranches.push(pruned)
//     }
//     return new TypeNode(prunedBranches)
// }

// function constrain<kind extends ConstraintKind>(
//     kind: kind,
//     definition: PredicateInput[kind]
// ) {
//     return new TypeNode(
//         this.rule.map((branch) => branch.constrain(kind, definition))
//     )
// }

// function and<other>(other: TypeNode<other>): TypeNode<t & other> {
//     const result = this.intersect(other)
//     return result instanceof Disjoint
//         ? result.throw()
//         : (result as TypeNode<t & other>)
// }

// function or<other>(other: TypeNode<other>): TypeNode<t | other> {
//     if (this === (other as unknown)) {
//         return this
//     }
//     return new TypeNode(TypeNode.reduceBranches([...this.rule, ...other.rule]))
// }

// function equals<other>(other: TypeNode<other>): this is TypeNode<other> {
//     return this === (other as unknown)
// }

// // function extends<other>(other: TypeNode<other>): this is TypeNode<other> {
// //     return this.intersect(other) === this
// // }

// // private declare _keyof: TypeNode | undefined
// const keyof = (): TypeNode => neverTypeNode

// function array(): TypeNode<t[]> {
//     const props = new PropsNode([{ key: arrayIndexTypeNode(), value: this }])
//     const predicate = new PredicateNode([arrayBasisNode, props])
//     return new TypeNode([predicate])
// }

// function isNever(): this is TypeNode<never> {
//     return this === neverTypeNode
// }

// function isUnknown(): this is TypeNode<unknown> {
//     return this === unknownTypeNode
// }

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
    bases extends BasisInput[]
> = {
    [i in keyof branches]: exact<
        branches[i],
        PredicateInput<bases[i & keyof bases]>
    >
}

type extractBases<
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

export const typeNodeFromInput = (input: TypeInput) =>
    isArray(input) ? TypeNode.from(...input) : TypeNode.from(input)

export const neverTypeNode = TypeNode([])

export const unknownTypeNode = TypeNode([unknownPredicateNode])

export const nonVariadicArrayIndexTypeNode = TypeNode.from(arrayIndexInput())
