import type { conform, exact, List, listable, Thunk } from "@arktype/utils"
import { cached, hasKey, isArray } from "@arktype/utils"
import type { CompilationContext } from "../../compile/compile.js"
import {
    compileFailureResult,
    compilePropAccess,
    InputParameterName
} from "../../compile/compile.js"
import { hasArkKind } from "../../compile/registry.js"
import type { inferred } from "../../parse/definition.js"
import type { inferIntersection } from "../../parse/semantic/intersections.js"
import type { ParseContext } from "../../scope.js"
import { Scope } from "../../scope.js"
import { Disjoint } from "../disjoint.js"
import type { BaseNodeMeta } from "../node.js"
import { alphabetizeByCondition } from "../node.js"
import type { BasisInput } from "../primitive/basis/basis.js"
import { classNode } from "../primitive/basis/class.js"
import type { ValueNode } from "../primitive/basis/value.js"
import { valueNode } from "../primitive/basis/value.js"
import type { CompositeNode } from "./composite.js"
import { defineComposite } from "./composite.js"
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

export interface TypeMeta extends BaseNodeMeta {}

export type TypeNodeConfig = defineComposite<{
    kind: "type"
    input: TypeInput | TypeRule
    rule: TypeRule
    meta: TypeMeta
}>

export type TypeRule = UnresolvedTypeNode | readonly PredicateNode[]

export type MaybeResolvedTypeNode = TypeNode | UnresolvedTypeNode

export type UnresolvedTypeNode = {
    alias: string
    resolve: Thunk<TypeNode>
}

export interface TypeNode<t = unknown> extends CompositeNode<TypeNodeConfig> {
    [inferred]: t
    branches: readonly PredicateNode[]
    discriminant: Discriminant | null
    value: ValueNode | undefined
    array(): TypeNode<t[]>
    isNever(): this is TypeNode<never>
    isUnknown(): this is TypeNode<unknown>
    and<other>(other: TypeNode<other>): TypeNode<inferIntersection<t, other>>
    or<other>(other: TypeNode<other>): TypeNode<t | other>
    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: PredicateInput[kind]
    ): TypeNode<t>
    equals<other>(other: TypeNode<other>): this is TypeNode<other>
    extends<other>(other: TypeNode<other>): this is TypeNode<other>
    keyof(): TypeNode<keyof t>
    getPath(...path: (string | TypeNode<string>)[]): TypeNode
}

export const typeNode = defineComposite<TypeNode>(
    {
        kind: "type",
        parse: (input, meta) => {
            if (hasKey(input, "resolve")) {
                return input
            }
            if (!isParsedTypeRule(input)) {
                input = isArray(input)
                    ? input.map((branch) => predicateNode(branch, meta))
                    : [predicateNode(input, meta)]
            }
            // TODO: figure out a better way to handle sorting (in composite?)
            return alphabetizeByCondition(reduceBranches([...input]))
        },
        compile: (rule, ctx) => {
            if (hasKey(rule, "resolve")) {
                return `$${rule.alias}(${InputParameterName})`
            }
            const discriminant = discriminate(rule)
            return discriminant
                ? compileDiscriminant(discriminant, ctx)
                : compileIndiscriminable(rule, ctx)
        },
        getReferences: (branches) =>
            hasKey(branches, "resolve")
                ? // TODO: unresolved?
                  []
                : branches.flatMap((predicate) => [...predicate.references]),
        intersect: (l, r): TypeNode | Disjoint => {
            if (l.branches.length === 1 && r.branches.length === 1) {
                const result = l.branches[0].intersect(r.branches[0])
                // TODO: intersect context
                return result instanceof Disjoint
                    ? result
                    : typeNode([result], l.meta)
            }
            const resultBranches = intersectBranches(l.branches, r.branches)
            return resultBranches.length
                ? typeNode(resultBranches, l.meta)
                : Disjoint.from("union", l, r)
        }
    },
    (base) => {
        let cachedBranches: readonly PredicateNode[] | undefined
        return {
            get branches() {
                if (!cachedBranches) {
                    cachedBranches = hasKey(base.rule, "resolve")
                        ? base.rule.resolve().branches
                        : base.rule
                }
                return cachedBranches
            },
            description: isArray(base.rule)
                ? base.rule.length === 0
                    ? "never"
                    : base.rule.map((branch) => branch.toString()).join(" or ")
                : base.rule.alias,
            // discriminate is cached so we don't have to worry about this running multiple times
            get discriminant() {
                return discriminate(this.branches)
            },
            get value() {
                return this.branches.length === 1
                    ? this.branches[0].value
                    : undefined
            },
            array(): any {
                const props = propsNode(
                    [{ key: arrayIndexTypeNode(), value: this }],
                    base.meta
                )
                const predicate = predicateNode(
                    {
                        basis: classNode(Array, base.meta),
                        props
                    },
                    base.meta
                )
                return typeNode([predicate], base.meta)
            },
            isNever() {
                return this.branches.length === 0
            },
            isUnknown() {
                return (
                    this.branches.length === 1 &&
                    this.branches[0].rule.length === 0
                )
            },
            and(other): any {
                const result = this.intersect(other as never)
                return result instanceof Disjoint ? result.throw() : result
            },
            or(other): any {
                if (this === (other as unknown)) {
                    return this
                }
                return typeNode(
                    reduceBranches([...this.branches, ...other.branches]),
                    base.meta
                )
            },
            constrain(kind, def): any {
                return typeNode(
                    this.branches.map((branch) => branch.constrain(kind, def)),
                    base.meta
                )
            },
            equals(other) {
                return this === other
            },
            // this.intersect(other as never) === this
            extends: () => false,
            keyof(): any {
                return this.branches.reduce(
                    (result, branch) => result.and(branch.keyof()),
                    builtins.unknown()
                )
            },
            getPath(...path): any {
                let current: readonly PredicateNode[] = this.branches
                let next: PredicateNode[] = []
                while (path.length) {
                    const key = path.shift()!
                    for (const branch of current) {
                        const propsAtKey = branch.getConstraints("props")
                        if (propsAtKey) {
                            const branchesAtKey =
                                typeof key === "string"
                                    ? propsAtKey.byName?.[key]?.value.branches
                                    : propsAtKey.indexed.find(
                                          (entry) => entry.key === key
                                      )?.value.branches
                            if (branchesAtKey) {
                                next.push(...branchesAtKey)
                            }
                        }
                    }
                    current = next
                    next = []
                }
                return typeNode(current, base.meta)
            }
        }
    }
)

const compileDiscriminant = (
    discriminant: Discriminant,
    ctx: CompilationContext
) => {
    if (discriminant.isPureRootLiteral) {
        // TODO: ctx?
        return compileDiscriminatedLiteral(discriminant.cases)
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
        ctx.discriminants.push(discriminant)
        const caseChecks = isArray(caseBranches)
            ? compileIndiscriminable(caseBranches, ctx)
            : compileDiscriminant(caseBranches, ctx)
        ctx.discriminants.pop()
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

const compileDiscriminatedLiteral = (cases: DiscriminatedCases) => {
    // TODO: error messages for traversal
    const caseKeys = Object.keys(cases)
    if (caseKeys.length === 2) {
        return `if( ${InputParameterName} !== ${caseKeys[0]} && ${InputParameterName} !== ${caseKeys[1]}) {
    return false
}`
    }
    // for >2 literals, we fall through all cases, breaking on the last
    const compiledCases =
        caseKeys.map((k) => `    case ${k}:`).join("\n") + "        break"
    // if none of the cases are met, the check fails (this is optimal for perf)
    return `switch(${InputParameterName}) {
    ${compiledCases}
    default:
        return false
}`
}

const compileIndiscriminable = (
    branches: readonly PredicateNode[],
    ctx: CompilationContext
) => {
    if (branches.length === 0) {
        return compileFailureResult("custom", "nothing", ctx)
    }
    if (branches.length === 1) {
        return branches[0].compile(ctx)
    }
    return branches
        .map(
            (branch) => `(() => {
${branch.compile(ctx)}
return true
})()`
        )
        .join(" || ")
}

const intersectBranches = (
    l: readonly PredicateNode[],
    r: readonly PredicateNode[]
): readonly PredicateNode[] => {
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

const isParsedTypeRule = (
    input: TypeInput | readonly PredicateNode[]
): input is readonly PredicateNode[] =>
    isArray(input) && (input.length === 0 || hasArkKind(input[0], "node"))

export const isUnresolvedNode = (
    node: MaybeResolvedTypeNode
): node is UnresolvedTypeNode => hasKey(node, "resolve")

export const maybeResolve = (node: MaybeResolvedTypeNode): TypeNode =>
    isUnresolvedNode(node) ? node.resolve() : node

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
        typeNode(branches, createAnonymousParseContext()) as never,
    {
        literal: (...branches: readonly unknown[]) => {
            const ctx = createAnonymousParseContext()
            return typeNode(
                branches.map(
                    (literal) => predicateNode([valueNode(literal, ctx)], ctx),
                    ctx
                ),
                ctx
            ) as never
        }
    }
)

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
