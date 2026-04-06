import { ServerTools } from '../../ServerTools';
export type ObjectTests = Array<Test>

type TypeReference = Array<string | number> | null;
type Type = 'string' | 'number' | 'boolean' | 'object' | 'array';
type TestBase = { key: string, nullable: boolean }
type ScalarTest = TestBase & { type: 'string' | 'number' | 'boolean', ref?: TypeReference }
type ObjectTest = TestBase & { type: 'object' }
type ArrayTest = TestBase & { type: 'array', ofTypeName: string, ofType: Type, ref?: TypeReference }
type Test = ScalarTest | ObjectTest | ArrayTest
type ValidationResult = { passed: true } | { passed: false, error: string }

export class ValidationTools extends ServerTools {

    public static isObject(name: string, value: unknown, nullable: boolean = false): ValidationResult {

        if (nullable && value === null)
            return ValidationTools.accept();

        if (
            (typeof value === 'object' && !Array.isArray(value))
            && value !== null
            && Object.keys(value).length
        )
            return ValidationTools.accept();

        return ValidationTools.reject(`${name} is not a valid object: ${value}`);
    }

    /**
     * @param objectType Only for error logging
     * @returns Error message strings
     * @example ('Foo', foo, tests) => []
     * @example ('Foo', foo, tests) => ['Foo is not a valid object: null']
     * @example ('Foo', foo, tests) => ['bar is not a valid string: 0', 'baz is not a valid object, []']
     */
    public static evaluateObject(objectType: string, value: unknown, tests: ObjectTests): Array<string> {
        const objectTest = ValidationTools.isObject(objectType, value);

        if (objectTest.passed) {
            const object = value as object;

            const propTests = tests.map(test => {
                const { key, type, nullable } = test;

                switch (type) {
                    case 'string': return ValidationTools.hasString(object, key, nullable, test.ref);
                    case 'number': return ValidationTools.hasNumber(object, key, nullable, test.ref);
                    case 'array': return ValidationTools.hasArray(object, key, test);
                    case 'object': return ValidationTools.hasObject(object, key, nullable);
                    case 'boolean': return ValidationTools.hasBoolean(object, key, nullable);
                    default: return ValidationTools.reject(`${key} is of unknown type: ${type}`);
                }
            });

            return ValidationTools.getErrors(propTests);
        }

        return [objectTest.error];
    }

    public static evaluateArray(typeName: string, value: unknown, type: Type, reference?: TypeReference) {
        const arrayTest = ValidationTools.isArray(typeName, value);

        if (arrayTest.passed) {
            const array = value as Array<unknown>;

            const isOfType = (() => {
                switch (type) {
                    case 'string': return ValidationTools.isString;
                    case 'number': return ValidationTools.isNumber;
                    case 'boolean': return ValidationTools.isBoolean;
                    case 'array': return ValidationTools.isArray;
                    case 'object': return ValidationTools.isObject;
                }
            })();

            const itemName = `${typeName} item`;
            for (let i = 0; i < array.length; i++) {
                const typeTest = isOfType(itemName, array[i]);

                if (!typeTest.passed)
                    return ValidationTools.reject(typeTest.error);
            }

            if (reference && (type == 'string' || type == 'number')) {
                for (let i = 0; i < array.length; i++) {
                    const element = array[i] as string | number;
                    const referenceTest = ValidationTools.isOfUnion(itemName, element, false, reference);

                    if (!referenceTest.passed)
                        return ValidationTools.reject(referenceTest.error);
                }
            }

            return ValidationTools.accept();
        }

        return ValidationTools.reject(arrayTest.error);
    }

    private static accept(): ValidationResult {
        return { passed: true };
    }

    private static reject(error: string): ValidationResult {
        return { passed: false, error };
    }

    private static getErrors(results: Array<ValidationResult>): Array<string> {
        return results
            .filter(result => !result.passed)
            .map(result => result.error);
    }

    private static hasKey(parent: object | null, key: string): ValidationResult {

        if (parent !== null && key in parent)
            return ValidationTools.accept();

        return ValidationTools.reject(`"${key}" property is missing.`);
    }

    private static isBoolean(name: string, value: unknown, nullable: boolean = false) {
        if ((nullable && value === null) || (typeof value === 'boolean'))
            return ValidationTools.accept();

        return ValidationTools.reject(`${name} is not a boolean: ${value}`);
    }

    private static hasBoolean(parent: object, key: string, nullable: boolean = false) {
        const keyTest = ValidationTools.hasKey(parent, key);

        if (keyTest.passed) {
            const value = parent[key as keyof object] as unknown;
            const booleanTest = ValidationTools.isBoolean(key, value, nullable);

            if (booleanTest.passed)
                return ValidationTools.accept();

            return ValidationTools.reject(`property ${booleanTest.error}`);
        }

        return ValidationTools.reject(keyTest.error);
    }

    private static isString(name: string, value: unknown, nullable: boolean = false): ValidationResult {

        if ((nullable && value === null) || (typeof value === 'string' && value.length))
            return ValidationTools.accept();

        return ValidationTools.reject(`${name} is not a valid string: ${value}`);
    }

    private static hasString(
        parent: object, key: string, nullable: boolean, reference: TypeReference = null,
    ): ValidationResult {
        const keyTest = ValidationTools.hasKey(parent, key);

        if (keyTest.passed) {
            const value = parent[key as keyof object] as unknown;
            const stringTest = ValidationTools.isString(key, value, nullable);

            if (stringTest.passed) {
                const referenceTest = ValidationTools.isOfUnion(key, value as string, nullable, reference);

                if (referenceTest.passed)
                    return ValidationTools.accept();

                return ValidationTools.reject(referenceTest.error);
            }

            return ValidationTools.reject(`property ${stringTest.error}`);
        }

        return ValidationTools.reject(keyTest.error);
    }

    private static isNumber(name: string, value: unknown, nullable: boolean = false): ValidationResult {

        if ((nullable && value === null) || typeof value === 'number')
            return ValidationTools.accept();

        return ValidationTools.reject(`${name} property is not a valid number: ${value}`);
    }

    private static hasNumber(
        parent: object, key: string, nullable: boolean = false, reference: TypeReference = null,
    ): ValidationResult {
        const keyTest = ValidationTools.hasKey(parent, key);

        if (keyTest.passed) {
            const value = parent[key as keyof object] as unknown;
            const numberTest = ValidationTools.isNumber(key, value, nullable);

            if (numberTest.passed) {

                const referenceTest = ValidationTools.isOfUnion(key, value as number, nullable, reference);

                if (referenceTest.passed)
                    return ValidationTools.accept();
                return ValidationTools.accept();
            }

            return ValidationTools.reject(numberTest.error);
        }

        return ValidationTools.reject(keyTest.error);
    }

    private static hasObject(parent: object | null, key: string, nullable: boolean = false): ValidationResult {
        const keyTest = ValidationTools.hasKey(parent, key);

        if (keyTest.passed) {
            const value = (parent as object)[key as keyof object] as unknown;
            const objectTest = ValidationTools.isObject(key, value, nullable);

            if (objectTest.passed)
                return ValidationTools.accept();

            return ValidationTools.reject(objectTest.error);
        }

        return ValidationTools.reject(keyTest.error);
    }

    private static isArray(name: string, value: unknown, nullable: boolean = false): ValidationResult {

        if (nullable && value === null || Array.isArray(value))
            return ValidationTools.accept();

        return ValidationTools.reject(`${name} is not a valid array: ${value}`);
    }

    private static hasArray(parent: object | null, key: string, test: ArrayTest): ValidationResult {
        const keyTest = ValidationTools.hasKey(parent, key);

        if (keyTest.passed) {
            const { nullable, ofTypeName, ofType, ref } = test;
            const value = (parent as object)[key as keyof object] as unknown;

            if (nullable && value == null)
                return ValidationTools.accept();

            const arrayTest = ValidationTools.evaluateArray(ofTypeName, value, ofType, ref);

            if (arrayTest.passed)
                return ValidationTools.accept();

            return ValidationTools.reject(arrayTest.error);
        }

        return ValidationTools.reject(keyTest.error);
    }

    private static isOfUnion(
        name: string, value: string | number, nullable: boolean, reference: TypeReference,
    ): ValidationResult {
        if (nullable && value === null || reference === null || reference.includes(value))
            return { passed: true };

        return { passed: false, error: `"${value}" is not a valid "${name}"` };
    }
}
