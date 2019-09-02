import React from "react"
import { motion } from "framer-motion"
import { Column, Card, Button, Row } from "@re-do/components"
import Logo from "assets/logo.svg"
import { store } from "renderer/common"
import { Page } from "renderer/state"
import { SignIn } from "./SignIn"
import { SignUp } from "./SignUp"

export type LandingProps = {
    page: Page.SignIn | Page.SignUp
}

export const Landing = ({ page }: LandingProps) => {
    const isSignIn = page === Page.SignIn
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: 360,
                    height: 400,
                    padding: "24px 40px"
                }}
            >
                <Column full justify="space-between">
                    <Logo />
                    <motion.div
                        layoutTransition={{
                            type: "spring",
                            damping: 20,
                            stiffness: 300
                        }}
                    >
                        {isSignIn ? <SignIn /> : <SignUp />}
                    </motion.div>
                </Column>
            </Card>
            <Button
                style={{
                    marginTop: 8
                }}
                kind="secondary"
                onClick={() =>
                    store.mutate({ page: isSignIn ? Page.SignUp : Page.SignIn })
                }
            >
                {isSignIn ? "Need an account?" : "Back to sign in"}
            </Button>
        </Column>
    )
}
