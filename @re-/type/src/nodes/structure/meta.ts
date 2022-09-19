import type { parseFn } from "../../parser/common.js"
import { throwParseError } from "../../parser/common.js"
import { scanner } from "../../parser/str/state/scanner.js"
import type { Base } from "../base.js"

export const metaTokens = scanner.tokens({
    $io: 1
})

export type MetaToken = keyof typeof metaTokens

export type MetaDefinition = [MetaToken, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[0] as any) in metaTokens

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [token, ...args],
    ctx
) =>
    token === "$io"
        ? ({} as Base.node)
        : throwParseError(`Unexpected meta token '${token}'.`)
