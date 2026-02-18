import sLib from '../../server_lib';

type TypeReference = Array<string | number> | null;

type Type = 'string' | 'number' | 'boolean' | 'object' | 'array';
type TestBase = {
    key: string,
    nullable: boolean,
}

type ScalarTest = TestBase & {
    type: 'string' | 'number' | 'boolean',
    ref?: TypeReference,
}

type ObjectTest = TestBase & {
    type: 'object',
}

type ArrayTest = TestBase & {
    type: 'array',
    ofTypeName: string,
    ofType: Type,
    ref?: TypeReference,
}

export type Test = ScalarTest | ObjectTest | ArrayTest

export type ObjectTests = Array<Test>

export type ValidationResult = { passed: true } | { passed: false, error: string }

function pass(): ValidationResult {
    return { passed: true };
}

function fail(error: string): ValidationResult {
    return { passed: false, error };
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

function isBoolean(name: string, value: unknown, nullable: boolean = false) {
    if ((nullable && value === null) || (typeof value === 'boolean'))
        return pass();

    return fail(`${name} is not a boolean: ${value}`);
}
function hasBoolean(parent: object, key: string, nullable: boolean = false) {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;
        const booleanTest = isBoolean(key, value, nullable);

        if (booleanTest.passed)
            return pass();

        return fail(`property ${booleanTest.error}`);
    }

    return fail(keyTest.error);
}

function isString(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if ((nullable && value === null) || (typeof value === 'string' && value.length))
        return pass();

    return fail(`${name} is not a valid string: ${value}`);
}
function hasString(parent: object, key: string, nullable: boolean, reference: TypeReference = null): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;
        const stringTest = isString(key, value, nullable);

        if (stringTest.passed) {
            const referenceTest = isOfUnion(key, value as string, nullable, reference);

            if (referenceTest.passed)
                return pass();

            return fail(referenceTest.error);
        }

        return fail(`property ${stringTest.error}`);
    }

    return fail(keyTest.error);
}

function isNumber(name: string, value: unknown, nullable: boolean = false): ValidationResult {

    if ((nullable && value === null) || typeof value === 'number')
        return pass();

    return fail(`${name} property is not a valid number: ${value}`);
}
function hasNumber(
    parent: object, key: string, nullable: boolean = false, reference: TypeReference = null,
): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const value = parent[key as keyof object] as unknown;
        const numberTest = isNumber(key, value, nullable);

        if (numberTest.passed) {

            const referenceTest = isOfUnion(key, value as number, nullable, reference);

            if (referenceTest.passed)
                return pass();
            return pass();
        }

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

    if (nullable && value === null || Array.isArray(value))
        return pass();

    return fail(`${name} is not a valid array: ${value}`);
}

function hasArray(parent: object | null, key: string, test: ArrayTest): ValidationResult {
    const keyTest = hasKey(parent, key);

    if (keyTest.passed) {
        const { nullable, ofTypeName, ofType, ref } = test;
        const value = (parent as object)[key as keyof object] as unknown;

        if (nullable && value == null)
            return pass();

        const arrayTest = evaluateArray(ofTypeName, value, ofType, ref);

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
                case 'string': return hasString(object, key, nullable, test.ref);
                case 'number': return hasNumber(object, key, nullable, test.ref);
                case 'array': return hasArray(object, key, test);
                case 'object': return hasObject(object, key, nullable);
                case 'boolean': return hasBoolean(object, key, nullable);
                default: return fail(`${key} is of unknown type: ${type}`);
            }
        });

        return getErrors(propTests);
    }

    return [objectTest.error];
}

function evaluateArray(typeName: string, value: unknown, type: Type, reference?: TypeReference) {
    const arrayTest = isArray(typeName, value);

    if (arrayTest.passed) {
        const array = value as Array<unknown>;

        const isOfType = (()=> {
            switch (type) {
                case 'string': return isString;
                case 'number': return isNumber;
                case 'boolean': return isBoolean;
                case 'array': return isArray;
                case 'object': return isObject;
            }
        })();

        const itemName = `${typeName} item`;
        for (let i = 0; i < array.length; i++) {
            const typeTest = isOfType(itemName, array[i]);

            if (!typeTest.passed)
                return fail(typeTest.error);
        }

        if (reference && (type == 'string' || type == 'number')) {
            for (let i = 0; i < array.length; i++) {
                const element  = array[i] as string | number;
                const referenceTest = isOfUnion(itemName, element, false, reference);

                if (!referenceTest.passed)
                    return fail(referenceTest.error);
            }
        }

        return pass();
    }

    return fail(arrayTest.error);
}

function isOfUnion(name: string, value: string | number, nullable: boolean, reference: TypeReference): ValidationResult {
    if(nullable && value === null || reference === null || reference.includes(value))
        return { passed: true };

    return { passed: false, error: `"${value}" is not a valid "${name}"` };
}

export const lib = {
    ...sLib,
    isObject,
    evaluateObject,
    evaluateArray,
};
