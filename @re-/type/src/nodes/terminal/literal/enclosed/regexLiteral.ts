import { RegexNode } from "../../obj/regex.js"

export type RegexLiteralDefinition = `/${string}/`

export const matcher = /\/.*\//

export const isRegexLiteralDefinition = (
    token: string
): token is RegexLiteralDefinition => matcher.test(token)

export const regexLiteralToNode = (expression: RegexLiteralDefinition) =>
    new RegexNode(new RegExp(expression.slice(1, -1)))
