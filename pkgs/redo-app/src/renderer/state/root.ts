import { Learner, learnerInitial, handleLearner } from "./substates"
import { ObjectType, Field, registerEnumType } from "type-graphql"
import { Handler } from "shapeql"

export enum Page {
    Home = "HOME",
    TestView = "TEST_VIEW",
    TagView = "TAG_VIEW",
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
    token: "fake",
    page: Page.Home,
    cardFilter: ""
}
