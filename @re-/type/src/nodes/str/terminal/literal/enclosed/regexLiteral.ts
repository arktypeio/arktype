import { Regex } from "../../../../obj/regex.js"

export type RegexLiteralDefinition = `/${string}/`

export const regexLiteralToNode = (expression: string) =>
    new Regex.Node(new RegExp(expression))
