import { Field, ID, ObjectType } from "type-graphql"
import { Validate, ValidateUnsubmitted, InType } from "./common"

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
    @Validate("email")
    email: string

    @Validate("filled")
    password: string
}
@InType()
export class SignUpInput extends SignInInput implements Partial<User> {
    @Validate("filled")
    firstName: string

    @Validate("filled")
    lastName: string

    @ValidateUnsubmitted({ matches: "password" })
    confirm: string
}
