export * from "../internal.js"

export type FirstEnclosed<
    Def extends string,
    Token extends string
> = Def extends `${Token}${infer Inner}${Token}${string}` ? Inner : never
