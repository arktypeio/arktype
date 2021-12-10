import React from "react"
import { Form, FormText, Row, FormSubmit } from "@re-do/components"
// import { useSignUpMutation, SignUpMutationVariables } from "@re-do/model"
import { store } from "renderer/common"
import { formatEmail } from "./common.js"

export const SignUp = () => <></>
// {
//     const [submit] = useSignUpMutation()
//     const disabled = store.useGet("page") !== "SIGN_UP"
//     return (
//         <Form<SignUpMutationVariables>
//             submit={async (data) => {
//                 const result = await submit({
//                     variables: { ...data, first: "", last: "" }
//                 })
//                 store.update({ token: result?.data?.signUp ?? "" })
//             }}
//             grow
//             full
//             justify="center"
//         >
//             <FormText
//                 name="email"
//                 errorTooltipPlacement="right"
//                 transform={formatEmail}
//                 disabled={disabled}
//             />
//             <Row spacing={1}>
//                 <FormText
//                     type="password"
//                     name="password"
//                     errorTooltipPlacement="left"
//                     disabled={disabled}
//                 />
//                 <FormText
//                     type="password"
//                     name="confirm"
//                     errorTooltipPlacement="right"
//                     disabled={disabled}
//                 />
//             </Row>
//             <FormSubmit>Sign up</FormSubmit>
//         </Form>
//     )
// }
