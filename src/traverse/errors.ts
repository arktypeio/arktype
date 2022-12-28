import type { CheckState } from "./check.js"

// export type ErrorsByCode = {
//     Unassignable: UnassignableDiagnostic
//     BoundViolation: BoundViolationDiagnostic
//     ExtraneousKeys: ExtraneousKeysDiagnostic
//     MissingKey: MissingKeyDiagnostic
//     Custom: CustomDiagnostic
//     NumberSubtype: NumberSubtypeDiagnostic
//     RegexMismatch: RegexMismatchDiagnostic
//     TupleLength: TupleLengthDiagnostic
//     Union: UnionDiagnostic
//     Divisor: ivisorError
// }
export const addProblem = (state: CheckState, message: string) => {
    state.problems.push({
        path: state.path.join(),
        reason: message
    })
}

export const unassignableError = (expected: unknown, data: unknown) =>
    `Expected: ${expected} (was '${data}')`
