export type BenchFormat = {
    noInline?: boolean
    noExternal?: boolean
}

export const getBenchFormat = (): BenchFormat => {
    const format: BenchFormat = { noInline: false, noExternal: false }
    const reassertCmd = process.env.RE_ASSERT_CMD
    if (reassertCmd) {
        if (!reassertCmd.includes("bench")) {
            format.noExternal = true
        }
        // sourcemaps are dookie or you just hate inline
        if (reassertCmd.includes("--no-inline")) {
            format.noInline = true
        }
        //testing fosho
        if (reassertCmd.includes("--no-external")) {
            format.noExternal = true
        }
    } else {
        format.noExternal = true
    }
    return format
}
