import { InField, InType, OutType, OutField, ID } from "./common"
import { User } from "./user"
import { BrowserEvent, BrowserEventInput } from "./browserEvent"
import { Tag, TagInput } from "./tag"

@InType()
export class TestInput {
    @InField({ validate: ["filled"] })
    name: string

    // TODO: Add validation
    @InField({ type: as => [TagInput] })
    tags: TagInput[]

    // TODO: Add validation
    @InField({ type: as => [BrowserEventInput] })
    steps: BrowserEventInput[]
}

@OutType()
export class Test {
    @OutField({ type: as => ID })
    readonly id: string

    @OutField()
    user: User

    @OutField()
    name: string

    @OutField({ type: as => [Tag] })
    tags: Tag[]

    @OutField({ type: as => [BrowserEvent] })
    steps: BrowserEvent[]
}
