import type { ts } from "ts-morph"
import { getFileKey } from "../../utils.js"
import { getTsMorphProject } from "../getTsMorphProject.js"

export type DiagnosticData = {
    start: number
    end: number
    message: string
}

export type DiagnosticsByFile = Record<string, DiagnosticData[]>

export const getDiagnosticsByFile = (): DiagnosticsByFile => {
    const project = getTsMorphProject()
    const diagnosticsByFile: DiagnosticsByFile = {}
    // We have to use this internal checker to access errors ignore by @ts-ignore or @ts-expect-error
    const diagnostics: ts.Diagnostic[] = (
        project.getTypeChecker().compilerObject as any
    ).getDiagnostics()
    for (const diagnostic of diagnostics) {
        addDiagnosticDataFrom(diagnostic, diagnosticsByFile)
    }
    return diagnosticsByFile
}

const addDiagnosticDataFrom = (
    diagnostic: ts.Diagnostic,
    diagnosticsByFile: DiagnosticsByFile
) => {
    const filePath = diagnostic.file?.fileName
    if (!filePath) {
        return
    }
    const fileKey = getFileKey(filePath)
    const start = diagnostic.start ?? -1
    const end = start + (diagnostic.length ?? 0)
    let message = diagnostic.messageText
    if (typeof message === "object") {
        message = concatenateChainedErrors([message])
    }
    const data: DiagnosticData = {
        start,
        end,
        message
    }
    if (diagnosticsByFile[fileKey]) {
        diagnosticsByFile[fileKey].push(data)
    } else {
        diagnosticsByFile[fileKey] = [data]
    }
}

const concatenateChainedErrors = (
    diagnostics: ts.DiagnosticMessageChain[]
): string =>
    diagnostics
        .map(
            (msg) =>
                `${msg.messageText}${
                    msg.next ? concatenateChainedErrors(msg.next) : ""
                }`
        )
        .join("\n")
