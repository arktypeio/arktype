import { caller } from "@re-/node"
import type { Node, Project, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { findCallExpressionAncestor } from "../snapshot.js"
import { forceCreateTsMorphProject } from "../type/index.js"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.js"
import type { BenchContext } from "./bench.js"
import type { Measure, MeasureComparison, TypeUnit } from "./measure/index.js"
import { createTypeComparison } from "./measure/index.js"

export type BenchTypeAssertions = {
    type: (instantiations?: Measure<TypeUnit>) => void
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

const isBenchExpression = (statement: Node<ts.ExpressionStatement>) => {
    const firstCallIdentifier = statement
        .getFirstChildByKind(SyntaxKind.CallExpression)
        ?.getFirstDescendantByKind(SyntaxKind.Identifier)
        ?.getText()
    return firstCallIdentifier === "bench" || firstCallIdentifier === "suite"
}

const getInstantiationsForIsolatedBench = (
    originalFileText: string,
    isolatedBenchExressionText: string,
    includeBenchFn: boolean,
    fakePath: string
) => {
    const isolatedProject = forceCreateTsMorphProject()
    const fileToTransform = isolatedProject.createSourceFile(
        fakePath,
        originalFileText
    )
    const currentBenchStatement = fileToTransform.getFirstDescendantOrThrow(
        (node) =>
            node.isKind(SyntaxKind.ExpressionStatement) &&
            node.getText() === isolatedBenchExressionText
    ) as Node<ts.ExpressionStatement>
    const siblingStatements = [
        ...currentBenchStatement.getPreviousSiblings(),
        ...currentBenchStatement.getNextSiblings()
    ].filter((node) =>
        node.isKind(SyntaxKind.ExpressionStatement)
    ) as Node<ts.ExpressionStatement>[]
    for (const statement of siblingStatements) {
        if (isBenchExpression(statement)) {
            statement.replaceWithText("")
        }
    }
    if (!includeBenchFn) {
        emptyBenchFn(currentBenchStatement)
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
    type: (...args: [instantiations?: Measure<TypeUnit> | undefined]) => {
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
        queueBaselineUpdateIfNeeded(comparison.updated, args[0], {
            ...ctx,
            kind: "type"
        })
    }
})
