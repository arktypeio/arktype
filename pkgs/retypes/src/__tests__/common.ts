import { getCaller } from "@re-do/node"
import { stringify } from "@re-do/utils"
import { Diagnostic } from "tsd/dist/lib/interfaces"

export const getNextType = () => {
    const caller = getCaller("getNextType")
    // @ts-ignore
    const diagnostics: Diagnostic[] = tsdData
    let nextDiagnostic: Diagnostic | undefined = undefined
    for (const d of diagnostics) {
        const line = d.line ?? -1
        if (caller.file.endsWith(d.fileName) && line >= caller.line) {
            if (
                !(nextDiagnostic && nextDiagnostic.line) ||
                line < nextDiagnostic.line
            ) {
                nextDiagnostic = d
            }
        }
    }
    if (!nextDiagnostic) {
        throw new Error(
            `No next type found from ${caller.file} at line ${caller.line}.`
        )
    }
    return nextDiagnostic
}
