import { Field, ID, ObjectType, InputType, ArgsType } from "type-graphql"
import { Expose } from "class-transformer"
import { User } from "./user"
import { BrowserEvent, BrowserEventInput } from "./browserEvent"
import { Tag, TagInput } from "./tag"

@ObjectType()
export class Test {
    @Field(type => ID)
    readonly id: string

    @Field()
    user: User

    @Field()
    name: string

    @Field(type => [Tag])
    tags: Tag[]

    @Field(type => [BrowserEvent])
    steps: BrowserEvent[]
}

@ArgsType()
export class TestInput {
    @Field()
    @Expose()
    name: string

    @Field(type => [TagInput])
    @Expose()
    tags: TagInput[]

    @Field(type => [BrowserEventInput])
    @Expose()
    steps: BrowserEventInput[]
}
