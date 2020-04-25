import React from "react"
import Typist from "react-typist"
import {
    Text,
    Column,
    AnimatedLogo,
    Row,
    Link,
    Icons,
    IconButton,
} from "@re-do/components"
import { Background } from "./Background"
import { SignUp } from "./SignUp"
import { TwitchInfo } from "./TwitchInfo"
import { layout } from "../constants"

export const AppHeader = () => {
    const startHeight = layout.headerHeight + layout.slantHeight
    const endHeight = layout.headerHeight
    return (
        <Column
            align="center"
            height={startHeight}
            style={{ position: "fixed", zIndex: 1 }}
        >
            <Background skewBetween={[startHeight, endHeight]} />
            <Row
                style={{ zIndex: 1, ...layout.header }}
                align="center"
                justify="space-around"
            >
                {layout.isMobile ? null : <TwitchInfo />}
                <Column
                    style={{
                        width: layout.middleWidth,
                    }}
                    justify="space-around"
                    align="center"
                >
                    <AnimatedLogo style={{ width: 300 }} />
                    <Text variant="h4" color="primary">
                        Web testing rewritten
                    </Text>
                    <Typist
                        startDelay={400}
                        avgTypingDelay={80}
                        cursor={{ show: false }}
                    >
                        <Text variant="h4" color="secondary">
                            is writing itself.
                        </Text>
                    </Typist>
                    <Row justify="space-around" align="baseline">
                        <Link to="/" variant="h6">
                            Home
                        </Link>
                        <Link to="/blog" variant="h6">
                            Blog
                        </Link>
                        <a href="https://bit.ly/on-git" target="_blank">
                            <IconButton Icon={Icons.gitHub} color="primary" />
                        </a>
                    </Row>
                </Column>
                {layout.isMobile ? null : <SignUp />}
            </Row>
        </Column>
    )
}
