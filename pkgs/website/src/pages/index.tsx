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
            <div style={{ height: 200 }} />
            <PrimaryContent>
                <Features content={features} />
                <HowItWorks />
                <SignUp />
            </PrimaryContent>
        </Page>
    )
}

export default Home
