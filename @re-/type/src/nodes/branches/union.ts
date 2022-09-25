import type { JsTypeName } from "@re-/tools"
import { Check, Generate } from "../traverse/exports.js"
import type { BranchAst, BranchConstructorArgs } from "./branch.js"
import { BranchNode } from "./branch.js"

export type UnionAst<Left = unknown, Right = unknown> = BranchAst<
    Left,
    Right,
    "|"
>

export class UnionNode extends BranchNode {
    constructor(...args: BranchConstructorArgs) {
        super("|", ...args)
    }

    check(state: Check.CheckState) {
        const rootErrors = state.errors
        const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
        for (const child of this.children) {
            state.errors = new Check.Diagnostics()
            child.check(state)
            if (!state.errors.length) {
                return
            }
            branchDiagnosticsEntries.push([child.toString(), state.errors])
        }
        state.errors = rootErrors
        this.addUnionDiagnostic(state, branchDiagnosticsEntries)
    }

    private addUnionDiagnostic(
        state: Check.CheckState,
        branchDiagnosticsEntries: BranchDiagnosticsEntry[]
    ) {
        const context: UnionDiagnostic["context"] = {
            definition: this.definition,
            actual: Check.stringifyData(state.data),
            branchDiagnosticsEntries
        }
        const explainBranches = state.options.errors?.union?.explainBranches
        // TODO: Better default error messages for union
        // https://github.com/re-do/re-po/issues/472
        state.errors.add(
            "union",
            {
                reason: `Must be one of ${this.definition}`,
                state: state,
                suffix: explainBranches
                    ? buildBranchDiagnosticsExplanation(
                          branchDiagnosticsEntries
                      )
                    : undefined
            },
            context
        )
    }

    generate(state: Generate.GenerateState) {
        const branchResults = this.generateChildren(state)
        if (!branchResults.values.length) {
            this.throwAllMembersUngeneratableError(branchResults.errors, state)
        }
        for (const constraint of preferredDefaults) {
            const matches = branchResults.values.filter((value) =>
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

    private generateChildren(state: Generate.GenerateState) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.generate(state))
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
        state: Generate.GenerateState
    ) {
        throw new Generate.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (state.options.generate?.verbose
                    ? `:\n${errors.join("\n")}`
                    : ".")
        )
    }
}

const buildBranchDiagnosticsExplanation = (
    branchDiagnosticsEntries: BranchDiagnosticsEntry[]
) => {
    let branchDiagnosticSummary = ":"
    for (const [
        branchDefinition,
        branchDiagnostics
    ] of branchDiagnosticsEntries) {
        branchDiagnosticSummary += `\n${branchDefinition}: ${branchDiagnostics.summary}`
    }
    return branchDiagnosticSummary
}

export type UnionDiagnostic = Check.DiagnosticConfig<
    {
        definition: string
        actual: unknown
        branchDiagnosticsEntries: BranchDiagnosticsEntry[]
    },
    {
        explainBranches: boolean
    }
>

export type BranchDiagnosticsEntry = [string, Check.Diagnostics]

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
