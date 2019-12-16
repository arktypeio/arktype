import { NexusGenArgTypes } from "./model"

export type Validators = {
    [MutationName in keyof NexusGenArgTypes["Mutation"]]: (
        data: NexusGenArgTypes["Mutation"][MutationName]
    ) => { [K in keyof NexusGenArgTypes["Mutation"][MutationName]]?: string }
}

// export const validators: Validators = {
//     createOneTest: ({ data: { name, steps, tags } }) => {}
// }
