import React from "react"
import { component, FormSubmitProps } from "blocks"
import { Mutation } from "react-apollo"
import { Session, SignInInput } from "redo-model"
import gql from "graphql-tag"
import { MutationProps } from "./Mutation"
import { createFormSubmit } from "blocks"

const SIGNIN = gql`
    mutation signIn($email: String!, $password: String!) {
        signIn(email: $email, password: $password) {
            token
        }
    }
`

export type WithSignInProps = MutationProps<SignInInput, SignInData>

export type SignInData = {
    signIn: Session
}

export const WithSignIn = component({
    name: "WithSignIn",
    defaultProps: {} as Partial<WithSignInProps>,
    store: true
})(({ children, variables, store }) => (
    <Mutation<SignInData, SignInInput>
        mutation={SIGNIN}
        variables={variables}
        onCompleted={data => store.mutate({ token: data.signIn.token })}
    >
        {children}
    </Mutation>
))

const InnerSignInSubmit = createFormSubmit<SignInInput, SignInData>()

export const SignInSubmit = () => <InnerSignInSubmit Mutation={WithSignIn} />
