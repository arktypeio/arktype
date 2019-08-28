import { InField, InType, OutType, OutField, ID } from "./common"
import { User } from "./user"

@OutType()
export class Tag {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField({ schemaSuffix: "String @unique" })
    name: string

    @OutField()
    user: User
}

@InType()
export class TagInput {
    @InField()
    name: string
}
