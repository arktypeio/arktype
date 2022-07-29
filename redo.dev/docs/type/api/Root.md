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
        ? Str.Validate<Def, Dict>
        : Def extends TerminalObj.Definition
        ? Def
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Struct.Validate<Def, Dict>
    export type Infer<
        Def,
        Ctx extends Base.Parsing.InferenceContext
    > = unknown extends Def
        ? Def
        : Def extends string
        ? Str.Infer<Def, Ctx>
        : Def extends BadDefinitionType
        ? never
        : Def extends TerminalObj.Definition
        ? TerminalObj.Infer<Def>
        : Struct.Infer<Def, Ctx>
    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Def extends TerminalObj.Definition
        ? TerminalObj.References<Def>
        : Def extends object
        ? Struct.References<Def, Dict, PreserveStructure>
        : []
    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol
    const BAD_DEF_TYPE_MESSAGE = "Type definitions must be strings or objects"
    type BadDefinitionTypeMessage = typeof BAD_DEF_TYPE_MESSAGE
    export const parse: Base.Parsing.ParseFn<unknown>
    export {}
}
```
