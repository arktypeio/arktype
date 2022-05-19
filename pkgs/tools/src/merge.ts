import { Evaluate, Iteration } from "./common.ts"

export type Mergeable<T> = T extends {} ? T : {}

export type Merge<Base, Merged> = Evaluate<
    Omit<Mergeable<Base>, Extract<keyof Base, keyof Merged>> & Mergeable<Merged>
>

export type MergeAll<Types, Result = {}> = Types extends Iteration<
    unknown,
    infer Current,
    infer Remaining
>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Evaluate<Result>
