import type { ScopeRoot } from "../scope.js"

export type DynamicParserContext = {
    scopeRoot: ScopeRoot
}

export const initializeParserContext = (
    scopeRoot: ScopeRoot
): DynamicParserContext => ({
    scopeRoot
})

export type StaticParserContext = {
    aliases: unknown
}

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`
