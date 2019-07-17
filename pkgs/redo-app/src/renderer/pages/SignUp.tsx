import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { AnimatePresence, motion } from "framer-motion"
import { Form, FormText, Column, Row, CardPage } from "blocks"
import { SecondarySignInButton } from "custom"
import { component } from "blocks"
import { SignUpSubmit } from "gql"
import { SignUpInput } from "redo-model"
import logo from "assets/logo.svg"

const styles = (theme: Theme) =>
    createStyles({
        fields: {
            flexGrow: 1
        }
    })

export const SignUp = component({
    name: "SignUp",
    styles
})(({ classes }) => {
    return (
        <Column align="center" justify="center">
            <CardPage>
                <Form validateAgainst={new SignUpInput()}>
                    <Column justify="space-evenly" className={classes.fields}>
                        <img src={logo} />
                        <AnimatePresence>
                            <motion.div
                                positionTransition
                                initial={{
                                    x: 500
                                }}
                                animate={{ x: 0 }}
                                exit={{ x: 500 }}
                                className={classes.fields}
                            >
                                <Row spacing={1}>
                                    <FormText
                                        holds="firstName"
                                        label="first"
                                        autoFocus
                                    />
                                    <FormText holds="lastName" label="last" />
                                </Row>
                                <Row spacing={1}>
                                    <FormText holds="email" fullWidth />
                                </Row>
                                <Row spacing={1}>
                                    <FormText
                                        holds="password"
                                        type="password"
                                    />
                                    <FormText holds="confirm" type="password" />
                                </Row>
                            </motion.div>
                        </AnimatePresence>
                        <SignUpSubmit />
                    </Column>
                </Form>
            </CardPage>
            <SecondarySignInButton text="Back to sign in" />
        </Column>
    )
})
