import { caller } from "@re-/node"
import { Node, Project, SourceFile, SyntaxKind, ts } from "ts-morph"
import { forceGetTsProject } from "../type/analysis.js"
import { findCallExpressionAncestor } from "../value/snapshot.js"
import { compareToBaseline, updateBaselineIfNeeded } from "./baseline.js"
import { BenchContext } from "./bench.js"
import {
    createTypeComparison,
    Measure,
    MeasureComparison,
    stringifyTypeMeasure,
    TypeString,
    TypeUnit
} from "./measure/index.js"

export type BenchTypeAssertions = {
    type: (instantiations?: TypeString) => void
}

const getInternalTypeChecker = (project: Project) =>
    project.getTypeChecker().compilerObject as ts.TypeChecker & {
        // This API is not publicly exposed
        getInstantiationCount: () => number
    }

const getUpdatedInstantiationCount = (project: Project) => {
    const typeChecker = getInternalTypeChecker(project)
    // Every time the project is updated, we need to emit to recalculate instantiation count.
    // If we try to get the count after modifying a file in memory without emitting, it will be 0.
    project.emitToMemory()
    return typeChecker.getInstantiationCount()
}

const getTransformedBenchFileText = (
    benchFn: Node<ts.CallExpression>,
    includeBenchFn: boolean
) => {
    const file = benchFn.getSourceFile()
    const originalText = file.getText()
    file.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((node) => {
        if (node === benchFn && includeBenchFn) {
            return
        }
        const benchCallStatement = node.getFirstAncestorByKindOrThrow(
            SyntaxKind.ExpressionStatement
        )
        benchCallStatement.replaceWithText("\n")
    })
    const transformedText = file.getFullText()
    /**
     *  Even though we're not actually emitting to the file system,
     *  it's still important to leave the node in its original state
     *  so that snap() calls work properly.
     */
    file.replaceWithText(originalText)
    return transformedText
}

const getInstantiationsContributedByNode = (
    benchFn: Node<ts.CallExpression>
) => {
    const fakePath = benchFn.getSourceFile().getFilePath() + ".nonexistent.ts"
    const projectWithNode = forceGetTsProject()
    projectWithNode.createSourceFile(
        fakePath,
        getTransformedBenchFileText(benchFn, true)
    )
    const instantiationsWithNode = getUpdatedInstantiationCount(projectWithNode)
    const projectWithoutNode = forceGetTsProject()
    projectWithoutNode.createSourceFile(
        fakePath,
        getTransformedBenchFileText(benchFn, false)
    )
    const instantiationsWithoutNode =
        getUpdatedInstantiationCount(projectWithoutNode)
    return instantiationsWithNode - instantiationsWithoutNode
}

export const createBenchTypeAssertion = (
    ctx: BenchContext
): BenchTypeAssertions => ({
    type: (...args: [instantiations?: TypeString | undefined]) => {
        ctx.lastSnapCallPosition = caller()
        const benchFnCall = findCallExpressionAncestor(
            ctx.benchCallPosition,
            "bench"
        )
        const instantiationsContributed =
            getInstantiationsContributedByNode(benchFnCall)
        const comparison: MeasureComparison<TypeUnit> = createTypeComparison(
            instantiationsContributed,
            args[0]
        )
        compareToBaseline(comparison, ctx)
        updateBaselineIfNeeded(
            stringifyTypeMeasure(comparison.result),
            args[0],
            {
                ...ctx,
                kind: "type"
            }
        )
    }
})
