import { OutType, OutField, ID } from "./common"
import { User } from "./user"

@OutType()
export class Session {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    token: string

    @OutField()
    user: User
}
