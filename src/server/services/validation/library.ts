
type Test = {
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

function hasObject(parent: object | null, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = (parent as object)[key as keyof object] as unknown;

        if (nullable && value === null)
            return pass();

        if (
            typeof value === 'object'
            && value !== null
            && Object.keys(value).length
        )
            return pass();

        return fail(`${key} property is not a valid object: ${value}`);
    }

    return fail(keyTest.error);
}

function evaluateObject(parent: object|null, key: string, tests: ObjectTests, nullable: boolean = false): Array<ValidationResult> {
    const objectResult = hasObject(parent, key, nullable);

    if (objectResult.passed) {
        const object = (parent as object)[key as keyof object] as object;

        return tests.map(test => {
            const { key, type, nullable } = test;

            switch (type) {
                case 'string': return hasString(object, key, nullable);
                case 'object': return hasObject(object, key, nullable); // basic test, should become recursive evaluation
                default: return fail(`Unknown type: ${type}`);
            }
        });
    }

    return [objectResult];
}

export const lib = {

    test: evaluateObject,

    getErrors: (results: Array<ValidationResult>): Array<string> => {

        return results
        .filter(result => !result.passed)
        .map(result => result.error);
    }
}
