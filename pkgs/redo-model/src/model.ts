import "reflect-metadata"
import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { IsNotEmpty, IsEmail } from "class-validator"
import { Expose } from "class-transformer"
import { EqualsProperty } from "./validators"

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

@ObjectType()
export class Session {
    @Field(type => ID)
    readonly id: string

    @Field()
    token: string

    @Field()
    user: User
}
