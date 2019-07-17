import { BrowserEvent } from "redo-model"
import { ObjectType, Field } from "type-graphql"
import { store } from "renderer/common"
import { handle } from "shapeql"

@ObjectType()
export class Events {
    @Field(type => [BrowserEvent])
    processed: BrowserEvent[]

    // TODO: Fix possible race condition
    @Field(type => [BrowserEvent])
    current: BrowserEvent[]
}

export const handleEvents = handle({
    current: async update => {
        if (update) {
            store.mutate({
                learner: {
                    events: {
                        current: _ => _.slice(1),
                        processed: _ => _.concat(update as BrowserEvent)
                    }
                }
            })
        }
    }
})
