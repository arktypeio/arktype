import "reflect-metadata"
import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { IsNotEmpty, IsEmail } from "class-validator"
import { EqualsProperty } from "./validators"

import { Expose } from "class-transformer"
export const InputField = () => (target: any, propertyKey: string) => {
    Field()(target, propertyKey)
    Expose()(target, propertyKey)
}

@ObjectType()
export class User {
    @Field(type => ID)
    readonly id: string

    @Field({ description: "String @unique" })
    email: string

    @Field()
    password: string

    @Field(type => [String])
    roles: string[]

    @Field()
    firstName: string

    @Field()
    lastName: string
}

@ArgsType()
@InputType()
export class SignInInput implements Partial<User> {
    @Field()
    @IsEmail({}, { message: "That doesn't look like a valid email." })
    email: string

    @Field()
    @IsNotEmpty({ message: "Password is required." })
    password: string
}

@ArgsType()
@InputType()
export class SignUpInput extends SignInInput implements Partial<User> {
    @Field()
    @IsNotEmpty({ message: "First name is required." })
    firstName: string

    @Field()
    @IsNotEmpty({ message: "Last name is required." })
    lastName: string

    @EqualsProperty("password", {
        message: "Those didn't match"
    })
    confirm: string
}
