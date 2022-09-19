import type { TypeOfResult } from "@re-/tools"
import { Allows } from "../../allows.js"
import type { strNode } from "../../common.js"
import { Create } from "../../create.js"
import type { Branch } from "./branch.js"
import { branch } from "./branch.js"

export type Union<Left = unknown, Right = unknown> = Branch<Left, Right, "|">

export class union extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "|" as const

    check(args: Allows.Args) {
        const unionDiagnostics: DiagnosticBranchEntry[] = []
        for (const child of this.children) {
            const branchDiagnostics = new Allows.Diagnostics()
            child.check({ ...args, diagnostics: branchDiagnostics })
            if (!branchDiagnostics.length) {
                return
            }
            unionDiagnostics.push([child.toString(), branchDiagnostics])
        }
        args.diagnostics.push(
            new UnionDiagnostic(this.toString(), args, unionDiagnostics)
        )
    }

    create(args: Create.Args) {
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

    private generateChildren(args: Create.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.create(args))
            } catch (error) {
                if (error instanceof Create.UngeneratableError) {
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
        args: Create.Args
    ) {
        throw new Create.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}

export type DiagnosticBranchEntry = [string, Allows.Diagnostics]

export class UnionDiagnostic extends Allows.Diagnostic<
    "Union",
    { expand?: boolean }
> {
    public message: string

    constructor(
        public type: string,
        args: Allows.Args,
        public branches: DiagnosticBranchEntry[]
    ) {
        super("Union", args)
        this.message = `Must be one of ${this.type} (got ${Allows.stringifyData(
            this.data
        )})${this.options?.expand ? ":" : "."}`
        if (this.options?.expand) {
            for (const [type, diagnostics] of this.branches) {
                this.message += `\n${type}: ${diagnostics.summary}`
            }
        }
    }
}

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
