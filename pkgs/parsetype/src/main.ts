import {
    Evaluate,
    ListPossibleTypes,
    Exact,
    Narrow,
    mergeAll
} from "@re-do/utils"
import {
    TypeDefinition,
    TypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    TypeSetDefinitions
} from "./definitions.js"
import { typeDefProxy } from "./common.js"
import { ParseType, ParseTypeSetDefinitions } from "./parse.js"

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: <Definitions extends any[]>(
        ...definitions: TypeSetDefinitions<Definitions, DeclaredTypeNames>
    ) => {
        const typeSetFromDefinitions = mergeAll(definitions)
        return {
            parse: <
                Definition,
                ActiveTypeSet = TypeSetFromDefinitions<Definitions>
            >(
                definition: TypeDefinition<
                    Narrow<Definition>,
                    ListPossibleTypes<keyof ActiveTypeSet>
                >,
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
            ) => ({
                definition,
                type: typeDefProxy as ParseType<Definition, ActiveTypeSet>,
                typeSet: typeSet ?? typeSetFromDefinitions,
                validate: (value: unknown) => {}
            }),
            types: typeDefProxy as Evaluate<
                ParseTypeSetDefinitions<Definitions>
            >
        }
    }
})

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const { compile } = declare()

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const { parse } = compile()
