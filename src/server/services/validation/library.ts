
export type Test = {
    key: string,
    type: 'string' | 'object',
    nullable: boolean,
    // values: Array<string|Test>
}
export type ObjectTests = Array<Test>

export type ValidationResult = {
    passed: boolean,
    error: string
}

function pass(): ValidationResult {

    return { passed: true, error: '' }
}

function fail(error: string): ValidationResult {

    return { passed: false, error }
}

function getErrors(results: Array<ValidationResult>): Array<string> {

    return results
    .filter(result => !result.passed)
    .map(result => result.error);
}

function hasKey(parent: object | null, key: string): ValidationResult {

    if (parent !== null && key in parent)
        return pass();

    return fail(`"${key}" property is missing.`);
}

function hasString(parent: object, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;

        if (nullable && value === null)
            return pass();

        if (typeof value === 'string' && value.length)
            return pass();

        return fail(`${key} property is not a valid string: ${value}`);
    }

    return fail(keyTest.error);
}

function isObject(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if (nullable && value === null)
        return pass();

    if (
        typeof value === 'object'
        && value !== null
        && Object.keys(value).length
    )
        return pass();

    return fail(`${name} is not a valid object: ${value}`);
}

function hasObject(parent: object | null, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = (parent as object)[key as keyof object] as unknown;
        const objectTest = isObject(key, value, nullable);

        if (objectTest.passed)
            return pass();

        return fail(objectTest.error);
    }

    return fail(keyTest.error);
}

function evaluateObject(objectType: string, value: unknown, tests: ObjectTests): Array<string> {
    const objectTest = isObject(objectType, value);

    if (objectTest.passed) {
        const object = value as object;

        const propTests =  tests.map(test => {
            const { key, type, nullable } = test;

            switch (type) {
                case 'string': return hasString(object, key, nullable);
                case 'object': return hasObject(object, key, nullable); // basic test, should become recursive evaluation
                default: return fail(`${key} is of unknown type: ${type}`);
            }
        });

        return getErrors(propTests);
    }

    return [objectTest.error];
}

export const lib = {
    evaluateObject,
}
