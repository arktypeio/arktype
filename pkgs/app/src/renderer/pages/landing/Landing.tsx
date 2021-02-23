import React, { useLayoutEffect, useState } from "react"
import { motion } from "framer-motion"
import { Column, Card, Button, Row, AnimatedLogo } from "@re-do/components"
import { store } from "renderer/common"
import { Page } from "renderer/state"
import { SignIn } from "./SignIn"
import { SignUp } from "./SignUp"

export type LandingProps = {
    page: Page.SignIn | Page.SignUp
}

const slideBetween = [<SignIn />, <SignUp />]

export const Landing = ({ page }: LandingProps) => {
    const [sliderWidth, setSliderWidth] = useState<string | undefined>(
        undefined
    )
    const isSignIn = page === Page.SignIn
    useLayoutEffect(() => {
        // A rerender is required to get the layout right
        setSliderWidth("fit-content")
    })
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: 360,
                    height: 400,
                    padding: "24px 40px"
                }}
            >
                <AnimatedLogo />
                <Row width={sliderWidth} reverse={!isSignIn}>
                    {slideBetween.map(element => (
                        <motion.div
                            key={element.type.name}
                            layout
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 500
                            }}
                            style={{
                                width: 320,
                                paddingRight: 40,
                                height: 260
                            }}
                        >
                            {element}
                        </motion.div>
                    ))}
                </Row>
            </Card>
            <Button
                kind="secondary"
                style={{
                    marginTop: 8
                }}
                onClick={() =>
                    store.mutate({
                        page: isSignIn ? Page.SignUp : Page.SignIn
                    })
                }
            >
                {isSignIn ? "Need an account?" : "Back to sign in"}
            </Button>
        </Column>
    )
}
