import { InField, InType, OutType, OutField, ID } from "./common"
import { Tag, TagInput } from "./tag"
import { User } from "./user"

@OutType()
export class BrowserEvent {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    type: string

    @OutField()
    selector: string

    @OutField()
    value: string

    @OutField({ type: as => [Tag] })
    tags: Tag[]

    @OutField()
    user: User
}
@InType()
export class BrowserEventInput {
    @InField()
    type: string

    @InField()
    selector: string

    @InField()
    value: string

    @InField({ type: as => [TagInput] })
    tags: TagInput[]
}
