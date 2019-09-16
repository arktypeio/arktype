import { ObjectType, Field } from "type-graphql"

@ObjectType()
export class TodoAppState {
    @Field()
    todos: Todo[]

    @Field()
    darkThemeEnabled: boolean
}

@ObjectType()
export class Todo {
    @Field()
    id: string

    @Field()
    text: string

    @Field()
    completed: boolean
}

import { Store } from "./store"

const store = new Store({ root: TodoAppState })

store.initialize({ todos: [], darkThemeEnabled: false })
store.query({ todos: null })
store.mutate({
    todos: _ =>
        _.concat({
            id: _.length.toString(),
            text: "New Todo",
            completed: false
        }),
    darkThemeEnabled: true
})
store.query({ todos: { id: null }, darkThemeEnabled: null })
