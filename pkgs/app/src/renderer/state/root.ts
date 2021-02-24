export enum Page {
    Home = "HOME",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP",
    Builder = "LEARNER",
    Results = "RESULTS"
}

export type Root = {
    token: string
    page: Page
    cardFilter: string
}

export const initialRoot: Root = {
    token: "",
    page: Page.Home,
    cardFilter: ""
}
