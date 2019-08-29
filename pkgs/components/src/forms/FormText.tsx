import React, { FC } from "react"
import { TextInput, TextInputProps } from "../inputs"
import { ErrorText } from "../text"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"
import { FormActions, Fields } from "./FormContext"
import { Column, Row } from "../layouts"

export type FormTextProps = FormFieldProps & TextInputProps

type UpdateFieldErrorsOptions = Pick<FormActions<Fields>, "validate"> & {
    setError: (key: string, _: string, errors: string) => void
    clearError: (key: string) => void
    values: Fields
    touched: string[]
}

const updateFieldErrors = ({
    setError,
    clearError,
    validate,
    values,
    touched
}: UpdateFieldErrorsOptions) => {
    const validationResult = validate!(values)
    Object.keys(values)
        .filter(input => touched.includes(input))
        .forEach(key => {
            if (
                key in validationResult &&
                validationResult[key] &&
                validationResult[key]!.length
            ) {
                setError(key, "error", validationResult[key]!.join("\n"))
            } else {
                clearError(key)
            }
        })
}

export const FormText: FC<FormTextProps> = ({
    name,
    label,
    fullWidth,
    ...rest
}) => {
    const {
        register,
        errors,
        validate,
        getValues,
        setError,
        clearError,
        touched,
        submit
    } = useFormContext()
    return (
        <>
            <Column height={70} width={200} align="center">
                <TextInput
                    name={name}
                    label={label ? label : name}
                    inputRef={register}
                    onBlur={() => {
                        if (!touched.includes(name)) {
                            touched.push(name)
                        }
                        updateFieldErrors({
                            setError,
                            validate,
                            values: getValues(),
                            touched,
                            clearError
                        })
                    }}
                    onKeyDown={async (
                        event: React.KeyboardEvent<HTMLDivElement>
                    ) => {
                        if (event.key === "Enter") {
                            submit(getValues())
                        }
                    }}
                    {...rest}
                />

                {errors[name] && errors[name].message ? (
                    <Row full={true} justify="flex-start">
                        <ErrorText>
                            {errors[name].message.split("\n")}
                        </ErrorText>
                    </Row>
                ) : null}
            </Column>
        </>
    )
}
