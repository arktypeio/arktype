# Root

## tags

```ts
undefined
```

## text

```ts
export declare namespace Root {
    export type Validate<Def, Dict> = Def extends []
        ? Def
        : Def extends string
        ? Str.Validate<Def, Dict, Def>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage<Def>
        : Def extends Obj.Leaves
        ? Def
        : Def extends object
        ? Obj.Validate<Def, Dict>
        : Def extends Literal.Definition
        ? Def
        : Common.Parser.ParseErrorMessage<Common.Parser.UnknownTypeErrorMessage>
    export type Parse<Def, Dict, Seen> = IsAnyOrUnknown<Def> extends true
        ? Def
        : Def extends string
        ? Str.Parse<Def, Dict, Seen>
        : Def extends BadDefinitionType
        ? unknown
        : Def extends object
        ? Obj.Parse<Def, Dict, Seen>
        : Def extends Literal.Definition
        ? Def
        : IsAny<Dict> extends true
        ? any
        : unknown
    export type BadDefinitionType = Function | symbol
    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        Common.Parser.ParseErrorMessage<`Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`>
    export const parse: Common.Parser.Parser<unknown>
    export {}
}
```
