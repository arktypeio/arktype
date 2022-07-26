export namespace TerminalObj {
    export type Definition = RegExp

    export type Infer<Def extends Definition> = Def extends RegExp
        ? string
        : never

    export type References<Def extends Definition> = Def extends RegExp
        ? [`/${string}/`]
        : []
}
