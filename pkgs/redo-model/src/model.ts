import "reflect-metadata"
import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { IsNotEmpty } from "class-validator"
import { Expose } from "class-transformer"
import { EqualsProperty, IsEmail } from "./validators"

@ObjectType()
export class BrowserEvent {
    @Field()
    type: string

    @Field({ nullable: true })
    selector?: string

    @Field({ nullable: true })
    value?: string
}

@ObjectType()
export class Test {
    @Field()
    name: string

    @Field(type => [String])
    tags: string[]

    @Field(type => [BrowserEvent])
    steps: BrowserEvent[]
}

@ObjectType()
export class User {
    @Field(type => ID)
    readonly id: string | number

    @Field()
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

@ObjectType()
export class Session {
    @Field()
    token: string

    @Field()
    user: User
}

@ArgsType()
@InputType()
export class SignInInput implements Partial<User> {
    @Field()
    @Expose()
    @IsEmail({ message: "That doesn't look like a valid email." })
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
