import type { Node, Project, SourceFile, ts } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import type { AttestConfig } from "./config.js"
import { getConfig } from "./config.js"
import { caller } from "./main.js"
import { findCallExpressionAncestor } from "./snapshot.js"
import {
    forceCreateTsMorphProject,
    getTsMorphProject
} from "./type/cacheAssertions.js"
import type { SourcePosition } from "./utils.js"
import { chainableNoOpProxy } from "./utils.js"

export type BenchContext = {
    name: string
    cfg: AttestConfig
    benchCallPosition: SourcePosition
}

export const bench = (name: string, expression: unknown) => {
    const ctx: BenchContext = {
        name,
        cfg: getConfig(),
        benchCallPosition: caller()
    }
    if (typeof ctx.cfg.filter === "string" && !name.includes(ctx.cfg.filter)) {
        return chainableNoOpProxy
    }
    const project = getTsMorphProject()
    project.addSourceFileAtPath(ctx.benchCallPosition.file)
    const benchFnCall = findCallExpressionAncestor(
        getTsMorphProject(),
        ctx.benchCallPosition,
        "bench"
    )
    return getInstantiationsContributedByNode(benchFnCall)
}

export const getInternalTypeChecker = (project: Project) =>
    project.getTypeChecker().compilerObject as ts.TypeChecker & {
        // This API is not publicly exposed
        getInstantiationCount: () => number
    }

export const getUpdatedInstantiationCount = (project: Project) => {
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

const getInstantiationsWithFile = (fileText: string, fakePath: string) => {
    const isolatedProject = forceCreateTsMorphProject()
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
    if (!includeBenchFn) {
        emptyBenchFn(currentBenchStatement)
    }
    const text = fileToTransform.getText()
    fileToTransform.delete()
    return text
}

const instantiationsByPath: { [path: string]: number } = {}
const getInstantiationsContributedByNode = (
    benchCall: Node<ts.CallExpression>
) => {
    const originalFile = benchCall.getSourceFile()
    const originalPath = originalFile.getFilePath()
    const fakePath = originalPath + ".nonexistent.ts"
    const benchExpression = benchCall.getFirstAncestorByKindOrThrow(
        SyntaxKind.ExpressionStatement
    )
    const originalBenchExpressionText = benchExpression.getText()
    if (!instantiationsByPath[fakePath]) {
        console.log(`⏳ attest: Analyzing type assertions...`)
        const instantiationsWithNode = getInstantiationsWithFile(
            transformBenchSource(
                originalFile,
                originalBenchExpressionText,
                true,
                fakePath
            ),
            fakePath
        )
        instantiationsByPath[fakePath] = instantiationsWithNode
        console.log(`⏳ Cached type assertions \n`)
    }

    const instantiationsWithoutNode = getInstantiationsWithFile(
        transformBenchSource(
            originalFile,
            originalBenchExpressionText,
            false,
            fakePath
        ),
        fakePath
    )
    return instantiationsByPath[fakePath] - instantiationsWithoutNode
}
