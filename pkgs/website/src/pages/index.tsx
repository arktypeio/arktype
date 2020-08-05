import React from "react"
import { Features, HowItWorks, Page, Header } from "../components"
import { features } from "../content"

export const Home = () => {
    return (
        <Page subHeader={true}>
            <Features content={features} />
            <HowItWorks />
        </Page>
    )
}

export default Home
