import { Learner, learnerInitial, handleLearner } from "./substates"
import { ObjectType, Field, registerEnumType } from "type-graphql"
import { Handler } from "shapeql"

export enum Page {
    Home = "HOME",
    TreeView = "TREE_VIEW",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP",
    Learner = "LEARNER"
}

registerEnumType(Page, {
    name: "Page"
})

@ObjectType()
export class Root {
    @Field(type => Learner)
    learner: Learner

    @Field()
    token: string

    @Field()
    page: Page

    @Field()
    cardFilter: string
}

export const rootHandler: Handler<Root> = {
    learner: handleLearner
}

export const initialRoot: Root = {
    learner: learnerInitial,
    token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjanpwNnpwbHgwMDAydWNoNmNuaWlsMzlmIiwiaWF0IjoxNTY2NjMyMTUwfQ.ZdEiG0f-ld7u1JURhADCcOysEUQxLeV4xltWkc7gX-E",
    page: Page.Home,
    cardFilter: ""
}
