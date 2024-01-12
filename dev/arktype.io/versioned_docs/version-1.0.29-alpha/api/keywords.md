---
hide_table_of_contents: true
---

# Keywords

## jsObjectsScope

| Name     | Type                           | Description |
| -------- | ------------------------------ | ----------- |
| Function | ` (...args: any[]) => unknown` |             |
| Date     | ` Date`                        |             |
| Error    | ` Error`                       |             |
| Map      | ` Map<unknown, unknown>`       |             |
| RegExp   | ` RegExp`                      |             |
| Set      | ` Set<unknown>`                |             |
| WeakMap  | ` WeakMap<object, unknown>`    |             |
| WeakSet  | ` WeakSet<object>`             |             |
| Promise  | ` Promise<unknown>`            |             |

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

| Name          | Type                                                               | Description                  |
| ------------- | ------------------------------------------------------------------ | ---------------------------- |
| alpha         | ` string`                                                          | only letters                 |
| alphanumeric  | ` string`                                                          | only letters and digits      |
| lowercase     | ` string`                                                          | only lowercase letters       |
| uppercase     | ` string`                                                          | only uppercase letters       |
| creditCard    | ` string`                                                          | a valid credit card number   |
| email         | ` string`                                                          | a valid email                |
| uuid          | ` string`                                                          | a valid UUID                 |
| parsedNumber  | ` (In: string) => import("../../parse/ast/morph.js").Out<number>`  | a well-formed numeric string |
| parsedInteger | ` (In: string) => import("../../parse/ast/morph.js").Out<number>`  | a well-formed integer string |
| parsedDate    | ` (In: string) => import("../../parse/ast/morph.js").Out<Date>`    | a valid date                 |
| semver        | ` string`                                                          | a valid semantic version     |
| json          | ` (In: string) => import("../../parse/ast/morph.js").Out<unknown>` | a JSON-parsable string       |
| integer       | ` number`                                                          | an integer                   |
