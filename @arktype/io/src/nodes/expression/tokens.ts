export namespace Tokens {
    export const postfix = {
        "?": "optional",
        "[]": "array"
    } as const

    export type Postfix = keyof typeof postfix

    export const bound = {
        "<": "bound",
        ">": "bound",
        "<=": "bound",
        ">=": "bound",
        "==": "bound"
    } as const

    export type Bound = keyof typeof bound

    export const constraint = {
        "%": "divisibility",
        ...bound
    } as const

    export type Constraint = keyof typeof constraint

    export const branching = {
        "|": "union",
        "&": "intersection"
    } as const

    export type Branching = keyof typeof branching

    export const infix = {
        ...constraint,
        ...branching
    } as const

    export type Infix = keyof typeof infix

    export const base = {
        ...infix,
        ...postfix
    } as const

    export type Base = keyof typeof base
}
