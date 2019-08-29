import gql from "graphql-tag"
import {
    InField,
    InType,
    OutType,
    OutField,
    ID,
    createTypeMetadata,
    TypeAction
} from "./common"
import { User } from "./user"

@OutType()
export class Tag {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ unique: true })
    name: string

    @OutField()
    user: User
}

@InType()
export class TagInput {
    @InField()
    name: string
}

export const tagMetadata = createTypeMetadata({
    inType: TagInput,
    outType: Tag,
    gql: {
        get: gql`
            query {
                getTag {
                    id
                    name
                }
            }
        `
    }
})
