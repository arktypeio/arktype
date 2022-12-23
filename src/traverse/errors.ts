export const ruleErrors = {
    // Critical: No other checks are performed if these fail
    subdomain: () => "Critical Error",
    // Shallow: All shallow checks will be performed even if one or more fail
    regex: (data, regex) => `${data} does not match ${regex}`,
    divisor: (data, divisor) => `${data} is not divisible by ${divisor}`,
    range: (data, range) => `${data} does not fall within range`,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    requiredProps: () => "Required props missing",
    optionalProps: () => "Optional props not found",
    // Validation: Only performed if all shallow and deep checks pass
    validator: "Failed to validate",
    domain: (data, domain) => `Mismatched domain ${typeof data} !== ${domain}`
}
