export namespace EmbeddedRegexLiteral {
    export type Definition<Expression extends string> =
        Expression extends `${string}/${string}` ? never : `/${Expression}/`

    // Matches a definition enclosed by forward slashes that does not contain any other forward slashes
    export const matcher = /^\/[^/]*\/$/
}
