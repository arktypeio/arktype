import React from "react"
import {
    Features,
    HowItWorks,
    Page,
    PrimaryContent,
    Header
} from "../components"
import { features } from "../content"

export const Home = () => {
    return (
        <Page>
            <Header displaySubHeader={true} />
            <PrimaryContent>
                <Features content={features} />
                <HowItWorks />
            </PrimaryContent>
        </Page>
    )
}

export default Home
