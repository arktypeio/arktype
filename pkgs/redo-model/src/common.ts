import { InputType, ArgsType, Field } from "type-graphql"
import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    IsNotEmpty,
    IsEmail
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
    email() {
        return createValidator({
            underlying: IsEmail,
            args: [{}, { message: "That doesn't look like a valid email." }]
        })
    }
    filled = () => {
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

export type InArgs<F extends boolean> = {
    validate?: ValidatorArg[]
    field?: F
} & (F extends true | undefined
    ? {
          type?: Parameters<typeof Field>[0]
          fieldOptions?: Parameters<typeof Field>[1]
      }
    : {})

export const In = <F extends boolean>({
    field,
    validate = [],
    ...fieldArgs
}: InArgs<F>) => (target: object, key: string) => {
    const validatorMap = new ValidatorMap()
    if (field || field === undefined) {
        const { type, fieldOptions } = fieldArgs as InArgs<true>
        Field(type, fieldOptions)(target, key)
    }
    validate.forEach(validator =>
        typeof validator === "string"
            ? validatorMap[validator]()(target, key)
            : V
    )
}

export const InType = () => (target: any) => {
    InputType()(target)
    ArgsType()(target)
}
