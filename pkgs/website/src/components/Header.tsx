import DocusaurusLink from "@docusaurus/Link"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Button } from "@re-do/components"

import React, { useEffect, useState } from "react"
import Typist from "react-typist"
import {
    Text,
    Column,
    AnimatedLogo,
    Row,
    Link,
    Icons,
    IconButton,
    Card,
    usePalette
} from "@re-do/components"
import { SignUp } from "./SignUp"
import { layout } from "./constants"

export const Header = () => {
    const [width, setWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    const angle = -Math.tan(50 / width)
    return (
        <div
            style={{
                position: "fixed",
                top: -24,
                zIndex: 1,
                transform: `skewY(${angle}rad)`,
                transformOrigin: "center"
            }}
        >
            <Card
                elevation={24}
                style={{
                    width
                }}
            >
                <div style={{ height: 24 }} />
                <Row
                    justify="center"
                    style={{ transform: `skewY(${-angle}rad)` }}
                >
                    <AnimatedLogo
                        style={{
                            width: 300
                        }}
                    />
                </Row>
            </Card>
            <Card
                elevation={24}
                style={{
                    width,
                    height: 150,
                    background: "#2979ff"
                }}
            >
                <Column
                    style={{
                        transform: `skewY(${-angle}rad)`
                    }}
                    justify="space-around"
                    align="center"
                >
                    <Text variant="h4" style={{ color: "white" }}>
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
                    <Link to={useBaseUrl("docs/")}>
                        <Button
                            kind="secondary"
                            style={{
                                color: "white",
                                borderColor: "white"
                            }}
                            size="large"
                        >
                            Get Started
                        </Button>
                    </Link>
                    {/* <Row justify="space-around" align="baseline">
                        <Link to="/" variant="h6">
                            Home
                        </Link>
                        <Link to="/blog" variant="h6">
                            Blog
                        </Link>
                        <a href="https://bit.ly/on-git" target="_blank">
                            <IconButton Icon={Icons.gitHub} color="primary" />
                        </a>
                    </Row> */}
                </Column>
            </Card>
        </div>
    )
}
