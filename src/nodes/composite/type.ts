import type {
    conform,
    exact,
    Literalable
} from "../../../dev/utils/src/main.js"
import { cached, isArray, resolveIfThunk } from "../../../dev/utils/src/main.js"
import { hasArkKind } from "../../compile/registry.js"
import type { CompilationState } from "../../compile/state.js"
import { compilePropAccess, InputParameterName } from "../../compile/state.js"
import type { inferred } from "../../parse/definition.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../node.js"
import { alphabetizeByCondition, defineNodeKind } from "../node.js"
import type { BasisInput } from "../primitive/basis/basis.js"
import { arrayClassNode } from "../primitive/basis/class.js"
import type { ValueNode } from "../primitive/basis/value.js"
import { valueNode } from "../primitive/basis/value.js"
import type { Discriminant, DiscriminatedCases } from "./discriminate.js"
import { discriminate } from "./discriminate.js"
import { arrayIndexInput, arrayIndexTypeNode } from "./indexed.js"
import type {
    ConstraintKind,
    inferPredicateDefinition,
    PredicateInput,
    PredicateNode
} from "./predicate.js"
import { predicateNode } from "./predicate.js"
import { propsNode } from "./props.js"

export interface TypeNode<t = unknown> extends BaseNode<PredicateNode[]> {
    [inferred]: t
    discriminant: Discriminant | null
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

const isParsedTypeRule = (
    input: TypeInput | PredicateNode[]
): input is PredicateNode[] =>
    isArray(input) && (input.length === 0 || hasArkKind(input[0], "node"))

export const typeNode = defineNodeKind<TypeNode, TypeInput>(
    {
        kind: "type",
        parse: (input) => {
            if (!isParsedTypeRule(input)) {
                input = isArray(input)
                    ? input.map((branch) => predicateNode(branch))
                    : [predicateNode(input)]
            }
            return alphabetizeByCondition(reduceBranches(input))
        },
        compile: (branches, s) => {
            const discriminant = discriminate(branches)
            return discriminant
                ? compileDiscriminant(discriminant, s)
                : compileIndiscriminable(branches, s)
        },
        intersect: (l, r): TypeNode | Disjoint => {
            if (l.rule.length === 1 && r.rule.length === 1) {
                const result = l.rule[0].intersect(r.rule[0])
                return result instanceof Disjoint ? result : typeNode([result])
            }
            const resultBranches = intersectBranches(l.rule, r.rule)
            return resultBranches.length
                ? typeNode(resultBranches)
                : Disjoint.from("union", l, r)
        }
    },
    (base) => ({
        description:
            base.rule.length === 0
                ? "never"
                : base.rule.map((branch) => branch.toString()).join(" or "),
        // discriminate is cached so we don't have to worry about this running multiple times
        discriminant: discriminate(base.rule),
        valueNode: base.rule.length === 1 ? base.rule[0].valueNode : undefined,
        array(): any {
            const props = propsNode([
                { key: arrayIndexTypeNode(), value: this }
            ])
            const predicate = predicateNode([arrayClassNode(), props])
            return typeNode([predicate])
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
            return typeNode(reduceBranches([...this.rule, ...other.rule]))
        },
        constrain(kind, def): any {
            return typeNode(
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
                                ? resolveIfThunk(
                                      propsAtKey.byName?.[key]?.value
                                  ).rule
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
            return typeNode(current)
        }
    })
)

const compileDiscriminant = (
    discriminant: Discriminant,
    s: CompilationState
) => {
    const isRootLiteral =
        discriminant.path.length === 0 &&
        discriminant.kind === "value" &&
        !discriminant.cases.default
    if (isRootLiteral) {
        return compileDiscriminatedLiteral(discriminant.cases, s)
    }
    let compiledPath = InputParameterName
    for (const segment of discriminant.path) {
        // we need to access the path as optional so we don't throw if it isn't present
        compiledPath += compilePropAccess(segment, true)
    }
    const condition =
        discriminant.kind === "domain" ? `typeof ${compiledPath}` : compiledPath
    let compiledCases = ""
    for (const k in discriminant.cases) {
        const caseCondition = k === "default" ? "default" : `case ${k}`
        const caseBranches = discriminant.cases[k]
        s.discriminants.push(discriminant)
        const caseChecks = isArray(caseBranches)
            ? compileIndiscriminable(caseBranches, s)
            : compileDiscriminant(caseBranches, s)
        s.discriminants.pop()
        compiledCases += `${caseCondition}: {
    ${caseChecks ? `${caseChecks}\n     break` : "break"}
}`
    }
    if (!discriminant.cases.default) {
        // TODO: error message for traversal
        compiledCases += `default: {
    return false
}`
    }
    return `switch(${condition}) {
    ${compiledCases}
}`
}

const compileDiscriminatedLiteral = (
    cases: DiscriminatedCases,
    s: CompilationState
) => {
    // TODO: error messages for traversal
    const caseKeys = Object.keys(cases)
    if (caseKeys.length === 2) {
        return `if( ${s.data} !== ${caseKeys[0]} && ${s.data} !== ${caseKeys[1]}) {
    return false
}`
    }
    // for >2 literals, we fall through all cases, breaking on the last
    const compiledCases =
        caseKeys.map((k) => `    case ${k}:`).join("\n") + "        break"
    // if none of the cases are met, the check fails (this is optimal for perf)
    return `switch(${s.data}) {
    ${compiledCases}
    default:
        return false
}`
}

const compileIndiscriminable = (
    branches: PredicateNode[],
    s: CompilationState
) => {
    if (branches.length === 0) {
        return s.invalid("custom", "nothing")
    }
    if (branches.length === 1) {
        return branches[0].compile(s)
    }
    return branches
        .map(
            (branch) => `(() => {
${branch.compile(s)}
return true
})()`
        )
        .join(" || ")
}

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

export type TypeNodeParser = {
    <branches extends PredicateInput[]>(
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

export const node: TypeNodeParser = Object.assign(
    (...branches: PredicateInput[]) => typeNode(branches),
    {
        literal: (...branches: Literalable[]) =>
            typeNode(
                branches.map((literal) => predicateNode([valueNode(literal)]))
            )
    }
) as never

export const builtins = {
    never: cached(() => node()),
    unknown: cached(() => node({})),
    nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
    string: cached(() => node({ basis: "string" })),
    array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>

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

export type TypeInput = PredicateInput | PredicateInput[]

export type validatedTypeNodeInput<
    input extends readonly PredicateInput[],
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
