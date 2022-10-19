import type { Base } from "../base/base.js"
import { Branching } from "./branching.js"

export namespace Union {
    export class Node extends Branching.Node<"|"> {
        readonly token = "|"
        readonly kind = "union"

        traverse(traversal: Base.Traversal) {
            const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
            const rootErrors = traversal.problems
            traversal.unionDepth++
            for (const child of this.children) {
                traversal.problems = new Diagnostics(traversal)
                child.traverse(traversal)
                if (!traversal.problems.length) {
                    break
                }
                branchDiagnosticsEntries.push([
                    child.toString(),
                    traversal.problems
                ])
            }
            traversal.unionDepth--
            traversal.problems = rootErrors
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
