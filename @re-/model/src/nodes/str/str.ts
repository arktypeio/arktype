import { ParseErrorMessage, UnknownTypeError } from "../../errors.js"
import { ParentNode } from "../node.js"
import { Alias } from "./alias.js"
import { EmbeddedBigintLiteral } from "./embeddedLiteral/embeddedBigintLiteral.js"
import { EmbeddedNumberLiteral } from "./embeddedLiteral/embeddedNumberLiteral.js"
import { EmbeddedRegexLiteral } from "./embeddedLiteral/embeddedRegexLiteral.js"
import { StringLiteral } from "./embeddedLiteral/stringLiteral.js"
import { Constraint, Intersection, List, Union } from "./expression/index.js"
import { Keyword } from "./keyword.js"
import { Optional } from "./optional.js"

type BinaryValidationResult<Left, Right> = Left extends ParseErrorMessage
    ? Left
    : Right extends ParseErrorMessage
    ? Right
    : Left

type BinaryValidate<
    Left extends string,
    Right extends string,
    Dict,
    Root
> = BinaryValidationResult<
    Str.Validate<Left, Dict, Root>,
    Str.Validate<Right, Dict, Root>
>

export namespace Str {
    export type Validate<Def extends string, Dict, Root> = Def extends
        | Keyword.Definition
        | keyof Dict
        | "cyclic"
        | "resolution"
        ? Root
        : Def extends Optional.Definition<infer Child>
        ? Optional.Validate<Child, Dict, Root>
        : Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | StringLiteral.Definition<infer Text>
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | EmbeddedRegexLiteral.Definition<infer Expression>
              | EmbeddedNumberLiteral.Definition
              | EmbeddedBigintLiteral.Definition
        ? Root
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends Union.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends List.Definition<infer Child>
        ? Validate<Child, Dict, Root>
        : Def extends Constraint.Definition
        ? Constraint.Validate<Def, Dict, Root>
        : ParseErrorMessage<UnknownTypeError<Def>>

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Keyword.Definition
        ? Keyword.Types[Def]
        : Def extends keyof Dict
        ? Alias.Parse<Def, Dict, Seen>
        : Def extends Optional.Definition<infer Child>
        ? Parse<Child, Dict, Seen> | undefined
        : Def extends StringLiteral.Definition<infer Text>
        ? Text
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Def extends EmbeddedRegexLiteral.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumberLiteral.Definition<infer Value>
        ? Value
        : Def extends EmbeddedBigintLiteral.Definition<infer Value>
        ? Value
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> & Str.Parse<Right, Dict, Seen>
        : Def extends Union.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> | Str.Parse<Right, Dict, Seen>
        : Def extends List.Definition<infer Child>
        ? Parse<Child, Dict, Seen>[]
        : Def extends Constraint.Definition
        ? Constraint.Parse<Def, Dict, Seen>
        : ParseErrorMessage<UnknownTypeError<Def>>

    export const Node: ParentNode<string, unknown> = {
        matches: (def): def is string => typeof def === "string",
        parse: (def, ctx) => {
            if (Optional.Node.matches(def)) {
                return new Optional.Node(def, ctx)
            } else if (Keyword.Node.matches(def)) {
                return new Keyword.Node(def, ctx)
            }
            throw new Error("hi")
        }
    }
}
