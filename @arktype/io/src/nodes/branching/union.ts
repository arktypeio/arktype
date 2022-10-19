import type { Problems } from "../traversal/problems.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Branching } from "./branching.js"

export namespace Union {
    export class Node extends Branching.Node<"|"> {
        readonly token = "|"
        readonly kind = "union"

        traverse(state: Base.TraversalState) {
            const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
            const rootErrors = state.problems
            state.unionDepth++
            for (const child of this.children) {
                state.problems = new Diagnostics(state)
                child.traverse(state)
                if (!state.problems.length) {
                    break
                }
                branchDiagnosticsEntries.push([
                    child.toString(),
                    state.problems
                ])
            }
            state.unionDepth--
            state.problems = rootErrors
            if (branchDiagnosticsEntries.length === this.children.length) {
                return
            }
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

    export type BranchDiagnosticsEntry = [string, Problems]
}
