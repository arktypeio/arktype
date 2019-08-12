import "reflect-metadata"
import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { IsNotEmpty, IsEmail } from "class-validator"
import { Expose } from "class-transformer"
import { EqualsProperty } from "./validators"

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
    @Expose()
    @IsEmail({}, { message: "That doesn't look like a valid email." })
    email: string

    @Field()
    @Expose()
    @IsNotEmpty({ message: "Password is required." })
    password: string
}

@ArgsType()
@InputType()
export class SignUpInput extends SignInInput implements Partial<User> {
    @Field()
    @Expose()
    @IsNotEmpty({ message: "First name is required." })
    firstName: string

    @Field()
    @Expose()
    @IsNotEmpty({ message: "Last name is required." })
    lastName: string

    @Expose()
    @EqualsProperty("password", {
        message: "Those didn't match"
    })
    confirm: string
}
