export declare enum DiffType {
    removed = "removed",
    common = "common",
    added = "added"
}
export interface DiffResult<T> {
    type: DiffType
    value: T
    details?: Array<DiffResult<T>>
}
/**
 * Renders the differences between the actual and expected values
 * @param A Actual value
 * @param B Expected value
 */
export declare function diff<T>(A: T[], B: T[]): Array<DiffResult<T>>
/**
 * Renders the differences between the actual and expected strings
 * Partially inspired from https://github.com/kpdecker/jsdiff
 * @param A Actual string
 * @param B Expected string
 */
export declare function diffstr(A: string, B: string): DiffResult<string>[]
export declare function buildMessage(
    diffResult: ReadonlyArray<DiffResult<string>>,
    {
        stringDiff
    }?: {
        stringDiff?: boolean | undefined
    }
): string[]
