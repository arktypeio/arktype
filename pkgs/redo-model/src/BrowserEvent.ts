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

@ArgsType()
@InputType()
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
