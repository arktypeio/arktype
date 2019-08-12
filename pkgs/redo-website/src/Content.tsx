import "typeface-ubuntu"
import React, { FC } from "react"
import { AppContents, Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp, SubHeader } from "./components"
import { layout } from "./constants"

export const Content: FC = () => {
    return (
        <AppContents>
            <Column align="center" style={{ overflow: "hidden" }}>
                <AppHeader mobile={true} />
                <Column
                    spacing={4}
                    style={{
                        position: "absolute",
                        top: layout.header.height,
                        ...layout.content
                    }}
                >
                    <SubHeader />
                    <HowItWorks />
                    <SignUp />
                </Column>
            </Column>
        </AppContents>
    )
}
