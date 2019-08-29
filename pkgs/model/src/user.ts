import { InField, InType, OutType, OutField, ID } from "./common"

@OutType()
export class User {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ schemaSuffix: "String @unique" })
    email: string

    @OutField()
    password: string

    @OutField()
    firstName: string

    @OutField()
    lastName: string
}

@InType()
export class SignInInput implements Partial<User> {
    @InField({ validate: ["email"] })
    email: string

    @InField({ validate: ["filled"] })
    password: string
}

@InType()
export class SignUpInput extends SignInInput implements Partial<User> {
    @InField({ validate: ["filled"] })
    firstName: string

    @InField({ validate: ["filled"] })
    lastName: string

    @InField({ submitted: false, validate: [{ matches: "password" }] })
    confirm: string
}
