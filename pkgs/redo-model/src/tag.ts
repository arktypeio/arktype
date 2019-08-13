import { Field, ID, ObjectType } from "type-graphql"
import { InType } from "./common"
import { User } from "./user"

@ObjectType()
export class Tag {
    @Field(type => ID)
    readonly id: string

    @Field({ description: "String @unique" })
    name: string

    @Field()
    user: User
}

@InType()
export class TagInput {
    @Field()
    name: string
}
