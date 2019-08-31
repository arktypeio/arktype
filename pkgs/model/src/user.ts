import { InField, InType, OutType, OutField, ID } from "./common"
import { Tag } from "./tag"
import { Test } from "./test"
import { Step } from "./step"

@OutType()
export class User {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ unique: true })
    email: string

    @OutField()
    password: string

    @OutField()
    firstName: string

    @OutField()
    lastName: string

    @OutField({ type: as => [Tag] })
    tags: Tag[]

    @OutField({ type: as => [Test] })
    tests: Tag[]

    @OutField({ type: as => [Step] })
    steps: Step[]
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
