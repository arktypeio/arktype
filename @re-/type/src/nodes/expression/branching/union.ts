import type { Check } from "../../traverse/check.js"
import { Diagnostics } from "../../traverse/diagnostics.js"
import { Branching } from "./branching.js"

export namespace Union {
    export const token = "|"

    export type Token = typeof token

    export class Node extends Branching.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            const rootErrors = state.errors
            const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
            for (const child of this.children) {
                state.errors = new Diagnostics(state)
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
            state: Check.State,
            branchDiagnosticsEntries: BranchDiagnosticsEntry[]
        ) {
            const explainBranches = state.queryContext(
                "errors",
                "union"
            )?.explainBranches
            // TODO: Better default error messages for union
            // https://github.com/re-do/re-po/issues/472
            state.addError("union", {
                type: this,
                message: `Must be one of ${this.toString()}`,
                details: explainBranches
                    ? buildBranchDiagnosticsExplanation(
                          branchDiagnosticsEntries
                      )
                    : undefined,
                branchDiagnosticsEntries
            })
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

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            branchDiagnosticsEntries: BranchDiagnosticsEntry[]
        },
        {
            explainBranches: boolean
        }
    >

    export type BranchDiagnosticsEntry = [string, Diagnostics]
}
