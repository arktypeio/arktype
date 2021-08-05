import React, { useLayoutEffect, useState } from "react"
import { motion } from "framer-motion"
import { Column, Card, Button, Row, AnimatedLogo } from "@re-do/components"
import { store } from "renderer/common"
import { SignIn } from "./SignIn.js"
import { SignUp } from "./SignUp.js"

export type LandingProps = {
    page: "SIGN_IN" | "SIGN_UP"
}

const slideBetween = [<SignIn />, <SignUp />]

export const Landing = ({ page }: LandingProps) => {
    const [sliderWidth, setSliderWidth] = useState<string>("auto")
    const isSignIn = page === "SIGN_IN"
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
                    {slideBetween.map((element) => (
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
                    store.update({
                        page: isSignIn ? "SIGN_UP" : "SIGN_IN"
                    })
                }
            >
                {isSignIn ? "Need an account?" : "Back to sign in"}
            </Button>
        </Column>
    )
}
