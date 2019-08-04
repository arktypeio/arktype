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
    SecondaryButton
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
        flexGrow: 1
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
        <Column css={{ justifyContent: "center", alignItems: "center" }}>
            <Card
                css={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
                <Logo />
                <Form<SignUpInput, SignUpData>
                    validate={validate}
                    submit={async fields => {
                        const result = await submitForm({ submit, fields })
                        if (result.data && result.data.signUp) {
                            store.mutate({ token: result.data.signUp.token })
                        }
                        return result
                    }}
                >
                    <Column justify="space-evenly" className={animatedFields}>
                        <AnimatePresence>
                            <motion.div
                                positionTransition
                                initial={{
                                    x: 500
                                }}
                                animate={{ x: 0 }}
                                exit={{ x: 500 }}
                                className={animatedFields}
                            >
                                <Row spacing={1}>
                                    <FormText
                                        name="firstName"
                                        label="first"
                                        autoFocus
                                    />
                                    <FormText name="lastName" label="last" />
                                </Row>
                                <Row spacing={1}>
                                    <FormText name="email" />
                                </Row>
                                <Row spacing={1}>
                                    <FormText type="password" name="password" />
                                    <FormText type="password" name="confirm" />
                                </Row>
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
            </Card>
            <SecondaryButton
                onClick={() => store.mutate({ page: Page.SignIn })}
            >
                Back to sign in
            </SecondaryButton>
        </Column>
    )
}
