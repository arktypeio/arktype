import {
    InField,
    InType,
    OutType,
    OutField,
    ID,
    TypeMetadata,
    TypeAction
} from "./common"
import gql from "graphql-tag"
import { User } from "./user"

@OutType()
export class Tag {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ schemaSuffix: "String @unique" })
    name: string

    @OutField()
    user: User
}

@InType()
export class TagInput {
    @InField()
    name: string
}

export const tagMetadata: TypeMetadata = {
    actions: [TypeAction.Run, TypeAction.Delete],
    gql: {
        update: gql`
            mutation modifyTag($id: String!, $name: String!) {
                modifyTag(id: $id, name: $name)
            }
        `
    },
    inType: TagInput,
    outType: Tag
}
