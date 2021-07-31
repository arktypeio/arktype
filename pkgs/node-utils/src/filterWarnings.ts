export const filterWarnings = (warningsToFilter: string[]) => {
    const { emitWarning } = process

    process.emitWarning = (warning, ...args) => {
        if (typeof args[0] === "string" && warningsToFilter.includes(args[0])) {
            return
        }

        if (
            typeof args[0] === "object" &&
            warningsToFilter.includes(args[0].type ?? "")
        ) {
            return
        }

        return emitWarning(warning, ...(args as any))
    }
}
