import { InField, InType, OutType, OutField, ID } from "./common"
import { User } from "./user"

@OutType()
export class Selector {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    css: string

    @OutField({ type: as => User })
    user: User
}

@InType()
export class SelectorInput {
    @InField()
    css: string
}

@InType()
export class SelectorUpdate {
    @InField({ options: { nullable: true } })
    css?: string
}
