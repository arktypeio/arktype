import { Check } from "../../traverse/check/check.js"
import { Nary } from "./nary.js"

export namespace Union {
    export const token = "|"

    export type Token = typeof token

    export class Node extends Nary.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            const rootErrors = state.errors
            const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
            for (const child of this.children) {
                state.errors = new Check.Errors()
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
            const context: Diagnostic["context"] = {
                definition: this.toString(),
                actual: Check.stringifyData(state.data),
                branchDiagnosticsEntries
            }
            const explainBranches = state.options.errors?.union?.explainBranches
            // TODO: Better default error messages for union
            // https://github.com/re-do/re-po/issues/472
            state.errors.add(
                "union",
                {
                    reason: `Must be one of ${this.toString()}`,
                    state,
                    suffix: explainBranches
                        ? buildBranchDiagnosticsExplanation(
                              branchDiagnosticsEntries
                          )
                        : undefined
                },
                context
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

    export type Diagnostic = Check.ConfigureDiagnostic<
        {
            definition: string
            actual: unknown
            branchDiagnosticsEntries: BranchDiagnosticsEntry[]
        },
        {
            explainBranches: boolean
        }
    >

    export type BranchDiagnosticsEntry = [string, Check.Errors]
}
