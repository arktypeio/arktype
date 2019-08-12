import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { User } from "./User"

@ObjectType()
export class Tag {
    @Field(type => ID)
    readonly id: string

    @Field({ description: "String @unique" })
    name: string

    @Field()
    user: User
}

@ArgsType()
@InputType()
export class TagInput {
    @Field()
    name: string
}
