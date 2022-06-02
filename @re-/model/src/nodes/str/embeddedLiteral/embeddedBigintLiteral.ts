export namespace EmbeddedBigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`
}
