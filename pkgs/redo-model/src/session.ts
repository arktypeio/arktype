import "reflect-metadata"
import { Field, ID, ObjectType } from "type-graphql"
import { User } from "./user"

@ObjectType()
export class Session {
    @Field(type => ID)
    readonly id: string

    @Field()
    token: string

    @Field()
    user: User
}
