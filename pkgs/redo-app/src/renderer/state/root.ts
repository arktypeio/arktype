import { Learner, learnerInitial, handleLearner } from "./substates"
import { ObjectType, Field, registerEnumType } from "type-graphql"
import { Handler } from "shapeql"

export enum Page {
    Home = "HOME",
    Detail = "DETAIL",
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

    @Field()
    detailView: string
}

export const rootHandler: Handler<Root> = {
    learner: handleLearner
}

export const initialRoot: Root = {
    learner: learnerInitial,
    token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjanpwdzgzZjIwMDAyOTVoNjY3Y2ZjMWIwIiwiaWF0IjoxNTY2NjcyNjY0fQ.jHn6fA8Xo00kRlp8zRLfH-mxeEVGhtUA5B3O4EVt8_w",
    page: Page.Detail,
    cardFilter: "",
    detailView: ""
}
