---
hide_table_of_contents: true
---

# Keywords

## jsObjectsScope

| Name     | Type                           | Description      |
| -------- | ------------------------------ | ---------------- |
| Function | ` (...args: any[]) => unknown` | a function       |
| Array    | ` unknown[]`                   | an array         |
| Date     | ` Date`                        | a Date           |
| Error    | ` Error`                       | an Error         |
| Map      | ` Map<unknown, unknown>`       | a Map            |
| RegExp   | ` RegExp`                      | a RegExp         |
| Set      | ` Set<unknown>`                | a Set            |
| Object   | ` Record<string, unknown>`     | an object        |
| String   | ` String`                      | a String object  |
| Number   | ` Number`                      | a Number object  |
| Boolean  | ` Boolean`                     | a Boolean object |
| WeakMap  | ` WeakMap<object, unknown>`    | a WeakMap        |
| WeakSet  | ` WeakSet<object>`             | a WeakSet        |
| Promise  | ` Promise<unknown>`            | a Promise        |

## tsKeywordsScope

| Name      | Type         | Description |
| --------- | ------------ | ----------- |
| any       | ` any`       | any         |
| bigint    | ` bigint`    | a bigint    |
| boolean   | ` boolean`   | a boolean   |
| false     | ` false`     | false       |
| never     | ` never`     | never       |
| null      | ` null`      | null        |
| number    | ` number`    | a number    |
| object    | ` object`    | an object   |
| string    | ` string`    | a string    |
| symbol    | ` symbol`    | a symbol    |
| true      | ` true`      | true        |
| unknown   | ` unknown`   | unknown     |
| void      | ` void`      | void        |
| undefined | ` undefined` | undefined   |

## validationScope

| Name          | Type                       | Description                  |
| ------------- | -------------------------- | ---------------------------- |
| alpha         | ` string`                  | only letters                 |
| alphanumeric  | ` string`                  | only letters and digits      |
| lowercase     | ` string`                  | only lowercase letters       |
| uppercase     | ` string`                  | only uppercase letters       |
| creditCard    | ` string`                  | a valid credit card number   |
| email         | ` string`                  | a valid email                |
| uuid          | ` string`                  | a valid UUID                 |
| parsedNumber  | ` (In: string) => number`  | a well-formed numeric string |
| parsedInteger | ` (In: string) => number`  | a well-formed integer string |
| parsedDate    | ` (In: string) => Date`    | a valid date                 |
| semver        | ` string`                  | a valid semantic version     |
| json          | ` (In: string) => unknown` | a JSON-parsable string       |
| integer       | ` number`                  | an integer                   |
