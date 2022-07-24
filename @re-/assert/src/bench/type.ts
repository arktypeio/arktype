import { caller } from "@re-/node"
import { Node, Project, SourceFile, SyntaxKind, ts } from "ts-morph"
import { forceGetTsProject } from "../type/analysis.js"
import { findCallExpressionAncestor } from "../value/snapshot.js"
import { compareToBaseline, updateBaselineIfNeeded } from "./baseline.js"
import { BenchContext } from "./bench.js"
import {
    createTypeComparison,
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

const emptyBenchFn = (statement: Node<ts.ExpressionStatement>) => {
    const benchCall = statement
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .find(
            (node) =>
                node.getFirstChildByKind(SyntaxKind.Identifier)?.getText() ===
                "bench"
        )
    if (!benchCall) {
        throw new Error(
            `Unable to find bench call from expression '${statement.getText()}'.`
        )
    }
    benchCall.getArguments()[1].replaceWithText("()=>{}")
}

const getTopLevelExpressionStatements = (file: SourceFile) =>
    file
        .getFirstChildByKindOrThrow(SyntaxKind.SyntaxList)
        .getChildrenOfKind(SyntaxKind.ExpressionStatement)

const isBenchExpression = (statement: Node<ts.ExpressionStatement>) =>
    statement
        .getFirstChildByKind(SyntaxKind.CallExpression)
        ?.getFirstDescendantByKind(SyntaxKind.Identifier)
        ?.getText() === "bench"

const getInstantiationsForIsolatedBench = (
    originalFileText: string,
    isolatedBenchExressionText: string,
    includeBenchFn: boolean,
    fakePath: string
) => {
    const isolatedProject = forceGetTsProject()
    const fileToTransform = isolatedProject.createSourceFile(
        fakePath,
        originalFileText
    )
    const topLevelStatements = getTopLevelExpressionStatements(fileToTransform)
    for (const statement of topLevelStatements) {
        if (statement.getText() === isolatedBenchExressionText) {
            if (!includeBenchFn) {
                emptyBenchFn(statement)
            }
        } else if (isBenchExpression(statement)) {
            statement.replaceWithText("")
        }
    }
    return getUpdatedInstantiationCount(isolatedProject)
}

const getInstantiationsContributedByNode = (
    benchCall: Node<ts.CallExpression>
) => {
    const fakePath = benchCall.getSourceFile().getFilePath() + ".nonexistent.ts"
    const originalFileText = benchCall.getSourceFile().getText()
    const benchExpression = benchCall.getFirstAncestorByKindOrThrow(
        SyntaxKind.ExpressionStatement
    )
    const originalBenchExpressionText = benchExpression.getText()
    const instantiationsWithNode = getInstantiationsForIsolatedBench(
        originalFileText,
        originalBenchExpressionText,
        true,
        fakePath
    )
    const instantiationsWithoutNode = getInstantiationsForIsolatedBench(
        originalFileText,
        originalBenchExpressionText,
        false,
        fakePath
    )
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
