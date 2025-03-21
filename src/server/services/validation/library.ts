
export type Test = {
    key: string,
    type: 'string' | 'object' | 'array' | 'number',
    nullable: boolean,
    // values: Array<string|Test>
}
export type ObjectTests = Array<Test>

export type ValidationResult = { passed: true } | { passed: false, error: string }

function pass(): ValidationResult {
    return { passed: true }
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

function isString(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if ((nullable && value === null) || (typeof value === 'string' && value.length))
        return pass();

    return fail(`${name} property is not a valid string: ${value}`)
}
function hasString(parent: object, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;
        const stringTest = isString(key, value, nullable);

        if (stringTest.passed)
            return pass();

        return fail(stringTest.error);
    }

    return fail(keyTest.error);
}

function isNumber(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if ((nullable && value === null) || typeof value === 'number')
        return pass();

    return fail(`${name} property is not a valid number: ${value}`)
}
function hasNumber(parent: object, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;
        const numberTest = isNumber(key, value, nullable);

        if (numberTest.passed)
            return pass();

        return fail(numberTest.error);
    }

    return fail(keyTest.error);
}

function isObject(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if (nullable && value === null)
        return pass();

    if (
        (typeof value === 'object' && !Array.isArray(value))
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

function isArray(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if (nullable && value === null)
        return pass();

    if (Array.isArray(value) && value !== null && Object.keys(value).length)
        return pass();

    return fail(`${name} is not a valid array: ${value}`);
}

function hasArray(parent: object | null, key: string, nullable: boolean = false): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = (parent as object)[key as keyof object] as unknown;
        const arrayTest = isArray(key, value, nullable);

        if (arrayTest.passed)
            return pass();

        return fail(arrayTest.error);
    }

    return fail(keyTest.error);
}

/**
 * @param objectType Only for error logging
 * @returns Error message strings
 * @example ('Foo', foo, tests) => []
 * @example ('Foo', foo, tests) => ['Foo is not a valid object: null']
 * @example ('Foo', foo, tests) => ['bar is not a valid string: 0', 'baz is not a valid object, []']
 */
function evaluateObject(objectType: string, value: unknown, tests: ObjectTests): Array<string> {
    const objectTest = isObject(objectType, value);

    if (objectTest.passed) {
        const object = value as object;

        const propTests = tests.map(test => {
            const { key, type, nullable } = test;

            switch (type) {
                case 'string': return hasString(object, key, nullable);
                case 'number': return hasNumber(object, key, nullable);
                case 'object': return hasObject(object, key, nullable);
                case 'array': return hasArray(object, key, nullable);
                default: return fail(`${key} is of unknown type: ${type}`);
            }
        });

        return getErrors(propTests);
    }

    return [objectTest.error];
}

export const lib = {
    isObject,
    evaluateObject,
}
