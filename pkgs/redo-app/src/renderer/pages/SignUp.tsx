import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles, useTheme } from "@material-ui/styles"
import { AnimatePresence, motion } from "framer-motion"
import {
    Form,
    FormText,
    Column,
    Row,
    FormSubmit,
    Card,
    Button
} from "redo-components"
import { SignUpInput } from "redo-model"
import Logo from "assets/logo.svg"
import { createValidator } from "custom/CustomForm"
import { store } from "renderer/common"
import { useMutation } from "@apollo/react-hooks"
import { submitForm } from "custom/CustomForm"
import gql from "graphql-tag"
import { Page } from "renderer/state"

const stylize = makeStyles((theme: Theme) => ({
    animatedFields: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-around"
    }
}))

type SignUpData = {
    signUp: {
        token: string
    }
}

export const SIGNUP = gql`
    mutation signUp(
        $firstName: String!
        $lastName: String!
        $email: String!
        $password: String!
    ) {
        signUp(
            firstName: $firstName
            lastName: $lastName
            email: $email
            password: $password
        ) {
            token
        }
    }
`

const validate = createValidator(new SignUpInput())

export const SignUp: FC = () => {
    const { animatedFields } = stylize()
    const theme = useTheme<Theme>()
    const [submit] = useMutation<SignUpData, SignUpInput>(SIGNUP)
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
                <Column full>
                    <Logo />
                    <Form<SignUpInput, SignUpData>
                        validate={validate}
                        submit={async fields => {
                            const result = await submitForm({ submit, fields })
                            if (result.data && result.data.signUp) {
                                store.mutate({
                                    token: result.data.signUp.token
                                })
                            }
                            return result
                        }}
                    >
                        <Column grow align="center">
                            <AnimatePresence>
                                <motion.div
                                    style={{ width: "100%" }}
                                    positionTransition
                                    initial={{
                                        x: 500
                                    }}
                                    animate={{ x: 0 }}
                                    exit={{ x: 500 }}
                                    className={animatedFields}
                                >
                                    <Column grow justify="center">
                                        <Row>
                                            <FormText
                                                style={{ width: "100%" }}
                                                name="firstName"
                                                label="first"
                                                autoFocus
                                            />
                                            <FormText
                                                style={{ width: "100%" }}
                                                name="lastName"
                                                label="last"
                                            />
                                        </Row>
                                        <Row>
                                            <FormText
                                                style={{ width: "100%" }}
                                                name="email"
                                            />
                                        </Row>
                                        <Row>
                                            <FormText
                                                style={{ width: "100%" }}
                                                type="password"
                                                name="password"
                                            />
                                            <FormText
                                                style={{ width: "100%" }}
                                                type="password"
                                                name="confirm"
                                            />
                                        </Row>
                                    </Column>
                                </motion.div>
                            </AnimatePresence>
                            <FormSubmit
                                responseOptions={{
                                    loading: { hideContent: true }
                                }}
                            >
                                Sign Up
                            </FormSubmit>
                        </Column>
                    </Form>
                </Column>
            </Card>

            <Button
                kind="secondary"
                onClick={() => store.mutate({ page: Page.SignIn })}
            >
                Back to sign in
            </Button>
        </Column>
    )
}
