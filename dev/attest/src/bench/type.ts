import type { Node, Project, SourceFile, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { getAttestConfig } from "../config.ts"
import { caller } from "../runtime/main.ts"
import { findCallExpressionAncestor } from "../snapshot.ts"
import {
    forceCreateTsMorphProject,
    getVirtualTsMorphProject
} from "../type/getTsMorphProject.ts"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.ts"
import type { BenchContext } from "./bench.ts"
import type { Measure, MeasureComparison } from "./measure/measure.ts"
import type { TypeUnit } from "./measure/types.ts"
import { createTypeComparison } from "./measure/types.ts"

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

const getInstantiationsWithFile = (fileText: string, fakePath: string) => {
    const isolatedProject = forceCreateTsMorphProject({
        useRealFs: false,
        preloadFiles: false
    })
    const config = getAttestConfig()
    for (const [path, contents] of config.typeSources) {
        if (!path.startsWith("src") && path !== "main.ts") {
            continue
        }
        isolatedProject.createSourceFile(path, contents, { overwrite: true })
    }
    isolatedProject.createSourceFile(fakePath, fileText)
    return getUpdatedInstantiationCount(isolatedProject)
}

const transformBenchSource = (
    originalFile: SourceFile,
    isolatedBenchExressionText: string,
    includeBenchFn: boolean,
    fakePath: string
) => {
    const fileToTransform = originalFile.copy(fakePath)
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
    const text = fileToTransform.getText()
    fileToTransform.delete()
    return text
}

const getInstantiationsContributedByNode = (
    benchCall: Node<ts.CallExpression>
) => {
    const originalFile = benchCall.getSourceFile()
    const fakePath = originalFile.getFilePath() + ".nonexistent.ts"
    const benchExpression = benchCall.getFirstAncestorByKindOrThrow(
        SyntaxKind.ExpressionStatement
    )
    const originalBenchExpressionText = benchExpression.getText()
    const instantiationsWithNode = getInstantiationsWithFile(
        transformBenchSource(
            originalFile,
            originalBenchExpressionText,
            true,
            fakePath
        ),
        fakePath
    )
    const instantiationsWithoutNode = getInstantiationsWithFile(
        transformBenchSource(
            originalFile,
            originalBenchExpressionText,
            false,
            fakePath
        ),
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
            getVirtualTsMorphProject(),
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
