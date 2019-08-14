import { InputType, ArgsType, Field } from "type-graphql"
import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    IsNotEmpty,
    IsEmail,
    IsEmpty
} from "class-validator"

export const Matches = <T extends Record<string, any>>(
    other: keyof T,
    validationOptions?: ValidationOptions
) => (target: T, key: keyof T) =>
    registerDecorator({
        name: "matches",
        target: target.constructor,
        propertyName: key as string,
        constraints: [other],
        options: validationOptions,
        validator: {
            validate(value: any, args: ValidationArguments) {
                const obj = args.object as T
                const matchingPropKey = args.constraints[0] as keyof T
                return value === obj[matchingPropKey]
            }
        }
    })

type ValidationDecorator = (
    ...args: any[]
) => (target: object, key: string) => any

type DefaultValidator<T extends ValidationDecorator> = {
    underlying: T
    args: Parameters<T>
}

const createValidator = <T extends ValidationDecorator>(
    options: DefaultValidator<T>
) => (target: object, key: string) => {
    const { underlying, args } = options
    underlying(...args)(target, key)
}

class ValidatorMap {
    email(_: true) {
        return createValidator({
            underlying: IsEmail,
            args: [{}, { message: "That doesn't look like a valid email." }]
        })
    }
    filled(value: boolean) {
        return createValidator({
            underlying: IsNotEmpty,
            args: [{ message: "It was empty." }]
        })
    }
    matches(other: string) {
        return createValidator({
            underlying: Matches,
            args: [other, { message: "That didn't match." }]
        })
    }
}

export type ValidatorArg =
    | keyof ValidatorMap
    | { [K in keyof ValidatorMap]?: Parameters<ValidatorMap[K]>[0] }

export const ValidateUnsubmitted = (...validators: ValidatorArg[]) => (
    target: object,
    key: string
) => {
    Object.entries(validators).forEach(([k, v]) =>
        (ValidatorMap as any)[k](v)(target, key)
    )
}

export const Validate = (...validators: ValidatorArg[]) => (
    target: object,
    key: string
) => {
    Field()(target, key)
    ValidateUnsubmitted(...validators)
}

export const InType = () => (target: any) => {
    InputType()(target)
    ArgsType()(target)
}
