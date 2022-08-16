import { RegexNode } from "../../obj/regex.js"

export type RegexLiteralDefinition = `/${string}/`

export const regexLiteralToNode = (expression: RegexLiteralDefinition) =>
    new RegexNode(new RegExp(expression.slice(1, -1)))
