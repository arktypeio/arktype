import { Field, ID, ObjectType } from "type-graphql"
import { EqualsProperty, Validate, InType } from "./common"

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

@InType()
export class SignInInput implements Partial<User> {
    @Field()
    @Validate("isEmail")
    email: string

    @Field()
    @IsNotEmpty({ message: "Password is required." })
    password: string
}
@InType()
export class SignUpInput implements Partial<User> {
    @Field()
    @Validate("isEmail")
    email: string

    @Field()
    @IsNotEmpty({ message: "Password is required." })
    password: string

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
