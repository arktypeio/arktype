import type { conform, exact, List, listable } from "@arktype/utils"
import { cached } from "@arktype/utils"
import type { ParseContext } from "../../scope.js"
import { Scope } from "../../scope.js"
import type {
    inferPredicateDefinition,
    PredicateInput
} from "../predicate/predicate.js"
import { PredicateNode } from "../predicate/predicate.js"
import type { BasisInput } from "../primitive/basis.js"
import { UnitNode } from "../primitive/unit.js"
import { TypeNode } from "../type.js"

export type TypeNodeParser = {
    <const branches extends PredicateInput[]>(
        ...branches: {
            [i in keyof branches]: conform<
                branches[i],
                validatedTypeNodeInput<branches, extractBases<branches>>[i]
            >
        }
    ): TypeNode<inferBranches<branches>>

    literal<const branches extends readonly unknown[]>(
        ...branches: branches
    ): TypeNode<branches[number]>
}

export type inferBranches<branches extends readonly PredicateInput[]> = {
    [i in keyof branches]: inferPredicateDefinition<branches[i]>
}[number]

export type inferTypeInput<input extends TypeInput> =
    input extends readonly PredicateInput[]
        ? inferBranches<input>
        : input extends PredicateInput
        ? inferPredicateDefinition<input>
        : input extends TypeNode<infer t>
        ? t
        : never

export type TypeInput = listable<PredicateInput>

export type validatedTypeNodeInput<
    input extends List<PredicateInput>,
    bases extends BasisInput[]
> = {
    [i in keyof input]: exact<input[i], PredicateInput<bases[i & keyof bases]>>
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

// TODO: bestway to handle?
const getEmptyScope = cached(() => Scope.root({}))

const createAnonymousParseContext = (): ParseContext => ({
    baseName: "anonymous",
    path: [],
    args: {},
    scope: getEmptyScope()
})

// TODO: cleanup
export const node: TypeNodeParser = Object.assign(
    (...branches: readonly PredicateInput[]) =>
        new TypeNode(branches, createAnonymousParseContext()) as never,
    {
        literal: (...branches: readonly unknown[]) => {
            const ctx = createAnonymousParseContext()
            return new TypeNode(
                branches.map(
                    (literal) =>
                        new PredicateNode([new UnitNode(literal, ctx)], ctx),
                    ctx
                ),
                ctx
            ) as never
        }
    }
)

// const isParsedTypeRule = (
//     input: TypeInput | readonly PredicateNode[]
// ): input is readonly PredicateNode[] =>
//     isArray(input) && (input.length === 0 || hasArkKind(input[0], "node"))

// // if (hasKey(input, "resolve")) {
// //     return input
// // }
// if (!isParsedTypeRule(input)) {
//     input = isArray(input)
//         ? input.map((branch) => new PredicateNode(branch, meta))
//         : [new PredicateNode(input, meta)]
// }
// // TODO: figure out a better way to handle sorting (in composite?)
// return alphabetizeByCondition(reduceBranches([...input]))

export const reduceBranches = (branchNodes: PredicateNode[]) => {
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
