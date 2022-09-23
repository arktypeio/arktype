import type { JsTypeName } from "@re-/tools"
import { Allows } from "../../allows.js"
import { Generate } from "../../generate.js"
import type { Branch, BranchConstructorArgs } from "./branch.js"
import { branch } from "./branch.js"

export type Union<Left = unknown, Right = unknown> = Branch<Left, Right, "|">

export class union extends branch {
    constructor(...args: BranchConstructorArgs) {
        super("|", ...args)
    }

    check(args: Allows.Args) {
        const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
        for (const child of this.children) {
            const branchDiagnostics = new Allows.Diagnostics()
            child.check({ ...args, diagnostics: branchDiagnostics })
            if (!branchDiagnostics.length) {
                return
            }
            branchDiagnosticsEntries.push([child.toString(), branchDiagnostics])
        }
        const context: UnionDiagnostic["context"] = {
            definition: this.definition,
            actual: Allows.stringifyData(args.data),
            branchDiagnosticsEntries
        }
        // TODO: Better way to get active options
        const explainBranches =
            args.cfg.diagnostics?.union?.explainBranches ||
            args.context.modelCfg.diagnostics?.union?.explainBranches
        args.diagnostics.add(
            "union",
            this.buildUnionDiagnosticReason(context, !!explainBranches),
            args,
            context
        )
    }

    // TODO: Better default error messages for union
    // https://github.com/re-do/re-po/issues/472
    private buildUnionDiagnosticReason(
        context: UnionDiagnostic["context"],
        explainBranches: boolean
    ) {
        let reason = `Must be one of ${this.definition}${
            explainBranches ? ":" : ""
        }`
        if (explainBranches) {
            for (const [
                branchDefinition,
                branchDiagnostics
            ] of context.branchDiagnosticsEntries) {
                reason += `\n${branchDefinition}: ${branchDiagnostics.summary}`
            }
        }
        return reason
    }

    generate(args: Generate.Args) {
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

    private generateChildren(args: Generate.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.generate(args))
            } catch (error) {
                if (error instanceof Generate.UngeneratableError) {
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
        args: Generate.Args
    ) {
        throw new Generate.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}

export type UnionDiagnostic = Allows.DefineDiagnostic<
    "union",
    {
        definition: string
        actual: unknown
        branchDiagnosticsEntries: BranchDiagnosticsEntry[]
    },
    {
        explainBranches: boolean
    }
>

export type BranchDiagnosticsEntry = [string, Allows.Diagnostics]

type PreferredDefaults = ({ value: any } | { typeOf: JsTypeName })[]

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
