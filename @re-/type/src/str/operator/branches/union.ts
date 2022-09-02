import { TypeOfResult } from "@re-/tools"
import { Branches, MergeExpression } from "./branch.js"
import { Branch, branch, Node, Parser, strNode } from "./common.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PreferredDefaults = ({ value: any } | { typeOf: TypeOfResult })[]

const preferredDefaults: PreferredDefaults = [
    { value: undefined },
    { value: null },
    { value: false },
    { value: true },
    { typeOf: "number" },
    { typeOf: "string" },
    { typeOf: "bigint" },
    { typeOf: "object" },
    { typeOf: "symbol" },
    { typeOf: "function" }
]

type PushRoot<B extends Branches, Root> = {
    union: [
        MergeExpression<B["union"], MergeExpression<B["intersection"], Root>>,
        "|"
    ]
}

export const reduceUnion = (s: Parser.state.withRoot, ctx: Node.context) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (!s.l.branches.union) {
        s.l.branches.union = new union([s.l.root], ctx)
    } else {
        s.l.branches.union.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceUnion<L extends Parser.Left> = Parser.Left.From<{
    lowerBound: L["lowerBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type StateWithMergeableUnion = Parser.state<{
    root: strNode
    branches: { union: union }
}>

export const hasMergeableUnion = (
    s: Parser.state.withRoot
): s is StateWithMergeableUnion => !!s.l.branches.union

export const mergeUnion = (s: StateWithMergeableUnion) => {
    s.l.branches.union.addMember(s.l.root)
    s.l.root = s.l.branches.union
    s.l.branches.union = undefined as any
    return s
}

export type Union<Left = unknown, Right = unknown> = Branch<Left, Right, "|">

export class union extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "|" as const

    allows(args: Node.Allows.Args) {
        const unionDiagnostics: Node.Allows.Diagnostics[] = []
        for (const child of this.children) {
            const branchDiagnostics = new Node.Allows.Diagnostics()
            if (child.allows({ ...args, diagnostics: branchDiagnostics })) {
                // If any branch of a Union does not have errors,
                // we can return right away since the whole definition is valid
                return true
            }
            unionDiagnostics.push(branchDiagnostics)
        }
        args.diagnostics.push(new UnionDiagnostic(args, this, unionDiagnostics))
        return false
    }

    create(args: Node.Create.Args) {
        const nextGenResults = this.generateChildren(args)
        if (!nextGenResults.values.length) {
            this.throwAllMembersUngeneratableError(nextGenResults.errors, args)
        }
        for (const constraint of preferredDefaults) {
            const matches = nextGenResults.values.filter((value) =>
                "value" in constraint
                    ? constraint.value === value
                    : constraint.typeOf === typeof value
            )
            if (matches.length) {
                return matches[0]
            }
        }
        throw new Error(
            `Unable to generate a value for unexpected union def ${this.toString()}.`
        )
    }

    private generateChildren(args: Node.Create.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.create(args))
            } catch (error) {
                if (error instanceof Node.Create.UngeneratableError) {
                    results.errors.push(error.message)
                } else {
                    throw error
                }
            }
        }
        return results
    }

    private throwAllMembersUngeneratableError(
        errors: string[],
        args: Node.Create.Args
    ) {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}

export class UnionDiagnostic extends Node.Allows.Diagnostic<"Union"> {
    readonly code = "Union"

    constructor(
        args: Node.Allows.Args,
        node: Node.base,
        public branches: Node.Allows.Diagnostics[]
    ) {
        super(args, node)
    }

    get message() {
        return `${Node.Allows.stringifyValue(
            this.data
        )} is not assignable to any of ${this.type}.`
    }
}
