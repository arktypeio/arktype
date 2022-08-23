import { TypeOfResult } from "@re-/tools"
import { Node } from "../../core.js"
import { Left, left, state } from "../../parser/index.js"
import { Branches } from "./branch.js"
import { Intersection } from "./intersection.js"

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

export namespace Union {
    export type PushRoot<B extends Branches.TypeState, Root> = {
        union: [
            Branches.MergeExpression<
                B["union"],
                Branches.MergeExpression<B["intersection"], Root>
            >,
            "|"
        ]
    }

    export const reduce = (s: state<left.withRoot>, ctx: Node.Context) => {
        if (Intersection.isMergeable(s)) {
            Intersection.merge(s)
        }
        if (!s.l.branches.union) {
            s.l.branches.union = new UnionNode([s.l.root], ctx)
        } else {
            s.l.branches.union.addMember(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Node<Left, Right> = [Left, "|", Right]

    export type Reduce<L extends Left.Base> = Left.From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: PushRoot<L["branches"], L["root"]>
        root: undefined
    }>

    export type Mergeable = state<{
        root: Node.node
        branches: { union: UnionNode }
    }>

    export const isMergeable = (s: state): s is Mergeable =>
        s.l.root !== undefined && s.l.branches.intersection instanceof UnionNode

    export const merge = (s: Mergeable) => {
        s.l.branches.union.addMember(s.l.root)
        s.l.root = s.l.branches.union
        s.l.branches.union = undefined as any
        return s
    }
}

export class UnionNode extends Node.NonTerminal<Node.node[]> {
    addMember(node: Node.node) {
        this.children.push(node)
    }

    toString() {
        return this.children.map((_) => _.toString()).join("|")
    }

    allows(args: Node.Allows.Args) {
        const unionErrors = args.errors.split(args.ctx.path)
        for (const branch of this.children) {
            const branchErrors = unionErrors.branch(branch.toString())
            if (branch.allows({ ...args, errors: branchErrors })) {
                // If any branch of a Union does not have errors,
                // we can return right away since the whole definition is valid
                return true
            }
        }
        // If we haven't returned, all branches are invalid, so add an error
        const summaryErrorMessage = `${Node.Utils.stringifyValue(
            args.value
        )} is not assignable to any of ${this.toString()}.`
        if (args.cfg.verbose) {
            unionErrors.mergeAll(summaryErrorMessage)
        } else {
            args.errors.add(args.ctx.path, summaryErrorMessage)
        }
        return false
    }

    create(args: Node.Create.Args) {
        // These results are *literally* from the next generation...
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
