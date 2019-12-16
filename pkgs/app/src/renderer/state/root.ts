import { Learner, learnerInitial, handleLearner } from "./learner"
import { Handler } from "react-statelessly"

export enum Page {
    Home = "HOME",
    Detail = "DETAIL",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP",
    Learner = "LEARNER",
    Results = "RESULTS"
}

export type Root = {
    learner: Learner
    token: string
    page: Page
    cardFilter: string
    detailView: string
}

export const rootHandler: Handler<Root> = {
    learner: handleLearner
}

export const initialRoot: Root = {
    learner: learnerInitial,
    token: "",
    page: Page.Home,
    cardFilter: "",
    detailView: ""
}
