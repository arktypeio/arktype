import type { Base } from "../base/base.js"
import type { Problems } from "../base/problems.js"
import { Branching } from "./branching.js"

export namespace Union {
    export class Node
        extends Branching.Node<"|">
        implements Base.ProblemSource
    {
        readonly token = "|"
        readonly kind = "union"

        traverse(traversal: Base.Traversal) {
            const branchDiagnosticsEntries: BranchDiagnosticsEntry[] = []
            for (const child of this.children) {
                traversal.pushBranch()
                child.traverse(traversal)
                if (!traversal.problems.length) {
                    break
                }
                branchDiagnosticsEntries.push([
                    child.toString(),
                    traversal.problems
                ])
                traversal.popBranch()
            }
            if (branchDiagnosticsEntries.length === this.children.length) {
                traversal.addProblem(this)
            }
        }

        get mustBe() {
            return this.description
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
