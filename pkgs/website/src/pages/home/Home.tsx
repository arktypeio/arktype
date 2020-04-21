import React from "react"
import { Column } from "@re-do/components"
import { HowItWorks } from "./HowItWorks"
import { SignUp, TwitchInfo } from "../../components"
import { layout } from "../../constants"
import { SubHeader } from "./SubHeader"

export const Home = () => (
    <Column align="center">
        <SubHeader />
        <HowItWorks />
        {layout.isMobile ? (
            <Column align="center">
                <SignUp />
                <div style={{ height: 40 }} />
                <TwitchInfo />
            </Column>
        ) : null}
        <div style={{ height: layout.contactInfo.height }} />
    </Column>
)
