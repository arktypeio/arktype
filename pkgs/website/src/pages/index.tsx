import React from "react"
import {
    Features,
    HowItWorks,
    Page,
    PrimaryContent,
    Header,
    SignUp
} from "../components"
import { features } from "../content"

export const Home = () => {
    return (
        <Page>
            <Header />
            <PrimaryContent>
                <Features content={features} />
                <HowItWorks />
                <SignUp />
            </PrimaryContent>
        </Page>
    )
}

export default Home
