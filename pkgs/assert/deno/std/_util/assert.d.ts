export declare class DenoStdInternalError extends Error {
    constructor(message: string)
}
/** Make an assertion, if not `true`, then throw. */
export declare function assert(expr: unknown, msg?: string): asserts expr
