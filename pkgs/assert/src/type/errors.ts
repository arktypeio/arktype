import { SourceRange } from "@re-do/node"
import { memoize, LinePosition, getLinePositions } from "@re-do/utils"
import { getTsContext } from "./ts.js"

type TypeError = {
    from: LinePosition
    to: LinePosition
    message: string
}

// Maps fileNames to a list objects representing errors
type ErrorsByFile = Record<string, TypeError[]>

export type TypeErrorsOptions = {}

export const typeErrorsInRange = (
    { file, from, to }: SourceRange,
    options: TypeErrorsOptions = {}
) => {
    const errorsInFile = getTypeErrors()[file]
    const errorsAfterCall = errorsInFile.filter(
        (error) =>
            error.from.line > from.line ||
            (error.from.line === from.line && error.from.column >= from.column)
    )
    const errorsInRange = errorsAfterCall.filter(
        (error) =>
            error.to.line < to.line ||
            (error.to.line === to.line && error.to.column <= to.column)
    )
    return errorsInRange.map((_) => _.message)
}

export const getTypeErrors = memoize(() => {
    const { ts, sources } = getTsContext()
    const diagnostics = ts
        .getSemanticDiagnostics()
        .concat(ts.getSyntacticDiagnostics())
    const errors = diagnostics.reduce(
        (errors, { file, start = 0, length = 1, messageText }) => {
            if (!file?.fileName || !sources[file.fileName]) {
                return errors
            }
            const [from, to] = getLinePositions(sources[file.fileName], [
                start,
                start + length - 1
            ])
            return {
                ...errors,
                [file.fileName]: (errors[file.fileName] ?? []).concat({
                    from,
                    to,
                    message:
                        typeof messageText === "string"
                            ? messageText
                            : messageText.messageText
                })
            }
        },
        {} as ErrorsByFile
    )
    return errors
})
