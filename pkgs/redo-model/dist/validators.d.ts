import { ValidationOptions } from "class-validator";
export declare function EqualsProperty(property: string, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsEmail(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
