import { TypeOfResult } from "@re-/tools"
import { Base } from "../../base/index.js"
import { State } from "../../parser/index.js"
import { Lexer } from "../../parser/lexer.js"
import { NonTerminal } from "../nonTerminal.js"
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

    export type Reduce<Tree extends State.Tree> = State.TreeFrom<{
        bounds: Tree["bounds"]
        groups: Tree["groups"]
        branches: PushRoot<Tree["branches"], Tree["root"]>
        root: undefined
    }>

    export const parse = (s: State.Value, ctx: Base.Parsing.Context) => {
        Intersection.merge(s)
        if (!s.branches.union) {
            s.branches.union = new UnionNode([s.root!], ctx)
        } else {
            s.branches.union.addMember(s.root!)
        }
        s.root = undefined
        Lexer.shiftBase(s.scanner)
    }

    export const merge = (s: State.Value) => {
        if (s.branches.union) {
            Intersection.merge(s)
            // TODO: Find a better way to deal with all these!
            s.branches.union.addMember(s.root!)
            s.root = s.branches.union
            s.branches.union = undefined
        }
    }

    export type Node<Left = unknown, Right = unknown> = [Left, "|", Right]
}

export class UnionNode extends NonTerminal<Base.Node[]> {
    addMember(node: Base.Node) {
        this.children.push(node)
    }

    toString() {
        return this.children.map((_) => _.toString()).join("|")
    }

    allows(args: Base.Validation.Args) {
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
        const summaryErrorMessage = `${Base.stringifyValue(
            args.value
        )} is not assignable to any of ${this.toString()}.`
        if (args.cfg.verbose) {
            unionErrors.mergeAll(summaryErrorMessage)
        } else {
            args.errors.add(args.ctx.path, summaryErrorMessage)
        }
        return false
    }

    generate(args: Base.Create.Args) {
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

    private generateChildren(args: Base.Create.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.generate(args))
            } catch (error) {
                if (error instanceof Base.Create.UngeneratableError) {
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
        args: Base.Create.Args
    ) {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}
