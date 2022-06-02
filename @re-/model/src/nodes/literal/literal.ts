export namespace Literal {
    export type Definition = RegExp | PrimitiveLiteral

    export type PrimitiveLiteral = number | bigint | boolean | undefined | null
}
