import { Common } from "#common"

export namespace StringLiteral {
    export type SingleQuoted<Text extends string> =
        Text extends `${string}'${string}` ? never : `'${Text}'`

    export type DoubleQuoted<Text extends string> =
        Text extends `${string}"${string}` ? never : `"${Text}"`

    /**
     * If Text is just string, it won't validate that it doesn't contain inner quotes.
     * Should be used like this to avoid definitions like 'foo'oo' being considered valid:
     *
     * Def extends StringLiteral.Definition<infer Text> ? Text : false
     *
     * Text would then infer the quoted value only if it doesn't contain its own quote type.
     * This ensures the same behavior as the regex matcher
     */
    export type Definition<Text extends string> =
        | SingleQuoted<Text>
        | DoubleQuoted<Text>

    /*
     * Matches a definition enclosed by single quotes that does not contain any other single quotes
     * Or a definition enclosed by double quotes that does not contain any other double quotes
     */
    export const matcher = /^('[^']*'|^"[^"]*?")$/

    export const matches = (def: string): def is Definition<string> =>
        matcher.test(def)

    export class Node extends Common.Leaf<Definition<string>> {
        quotedText = this.def.slice(1, -1)

        allows(args: Common.Allows.Args) {
            if (this.quotedText !== args.value) {
                this.addUnassignable(args)
            }
        }

        generate() {
            return this.quotedText
        }
    }
}
