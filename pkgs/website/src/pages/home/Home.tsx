import React from "react"
import { Features, HowItWorks, Page } from "../../components"
import { features } from "../../content"

export const Home = () => {
    return (
        <Page subHeader={true} animateScroll={true}>
            <Features content={features} />
            <HowItWorks />
        </Page>
    )
}

export default Home
