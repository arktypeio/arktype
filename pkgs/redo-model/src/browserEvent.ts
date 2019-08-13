import { Field, ID, ObjectType } from "type-graphql"
import { InType } from "./common"
import { Tag, TagInput } from "./tag"
import { User } from "./user"

@ObjectType()
export class BrowserEvent {
    @Field(type => ID)
    readonly id: string

    @Field()
    type: string

    @Field()
    selector: string

    @Field()
    value: string

    @Field(type => [Tag])
    tags: Tag[]

    @Field()
    user: User
}

@InType()
export class BrowserEventInput {
    @Field()
    type: string

    @Field()
    selector: string

    @Field()
    value: string

    @Field(type => [TagInput])
    tags: TagInput[]
}
