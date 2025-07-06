/**
 *  @description
 * Creates a deep copy of the input. Prevents referencing the original object.
 */
function deepCopy<T>(input: T): T {

    if (typeof input !== 'object' || input === null) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(deepCopy) as T;
    }

    return Object.fromEntries(Object.entries(input).map(
        ([k, val]: [string, unknown]): [string, unknown] => [k, deepCopy(val)]
    )) as T;
}

function valueExists(value: unknown) {
    switch(true) {
        case typeof value == 'number':
            return true;
        case Array.isArray(value):
            return Boolean(value.length);
        default:
            return Boolean(value);
    }
}

// MARK: PRIMITIVES

export type Writable<T> = {
    exists: () => boolean,
    set: (newVal: T) => void,
    get: () => T,
    update: (fn: (val: T) => T) => void,
    reset: () => void,
}
/**
 * @description
 * Creates a writable store primitive which can be used as is or wrapped in a store object to improve readability, customize methods, and enforce typing.
 * The parameter is copied, not referenced. **The store value is mutable**, but only through the methods provided and it can only be retrieved as a copy.
 * @method exists() returns true if the store has a value. Returns false on null, undefined, empty string, and empty array. True on empty object.
 * @method set() sets the store value to the input.
 * @method get() returns a copy of the store value.
 * @method update() sets the store value to the result of the input function, which takes the current store value as a parameter.
 * @method reset() sets the store value to the initial value.
*/
export function writable<T>(initialValue: T): Writable<T> {
    let value: T = deepCopy(initialValue);

    return {
        exists: () => valueExists(value),
        set: (newVal: T) => value = deepCopy(newVal),
        get: () => deepCopy(value),
        update: (fn: Function): void => value = deepCopy(fn(deepCopy(value))),
        reset: () => value = deepCopy(initialValue),
    }
}

export type Readable<T> = {
    exists: () => boolean,
    get: () => T,
}
/**
 * @description
 * Creates a readable store primitive which can be used as is or wrapped in a store object to improve readability, customize methods, and enforce typing.
 * The parameter is copied, not referenced. **The store value is immutable** and can only be retrieved as a copy.
 * @method exists() returns true if the store has a value. Returns false on null, undefined, empty string, and empty array. True on empty object.
 * @method get() returns a copy of the store value.
*/
export function readable<T>(initialValue: T): Readable<T> {
    const value: T = deepCopy(initialValue);

    return {
        exists: () => valueExists(value),
        get: () => deepCopy(value),
    }
}

// MARK: WRAPPERS

export type ArrayReadable<T> = {
    count: () => number,
    getAll: () => Array<T>,
    findOne: (criteria: string|number) => T | null,
}

export function arrayReadable<T>(fixedArray: Array<T>, keyName?: keyof T): ArrayReadable<T> {
    const array = readable(fixedArray);
    return {
        count: () => array.get().length,
        getAll: () => deepCopy(fixedArray),
        findOne: (criteria) => {
            return keyName
                ? array.get().find(e => e[keyName] === criteria) || null
                : array.get().find(e => e === criteria) || null;
        },
    }
}

// TODO: transfomr this to take an index and (modyifying the internals into a record).
export type ArrayWritable<T> = {
    count: () => number,
    getAll: () => Array<T>,
    includes: (criteria: string|number) => boolean,
    findOne: (criteria: string|number) => T | null,
    add: (element: T) => void,
    updateOne: (criteria: string|number, element: T) => void,
    removeOne: (criteria: string|number) => void,
    drawFirst: () => T | null,
    // drawLast: () => T,
    overwrite: (element: Array<T>) => void,
    clear: () => void,
    reset: () => void,
}

/**
 * @description Writable wrapper that implements array-specific methods.
 * @param initialArray May be empty.
 * @param keyName Unique object property used for searching. Unnecessary for scalar arrays.
 */
export function arrayWritable<T>(initialArray: Array<T>, keyName?: keyof T): ArrayWritable<T> {
    const array = writable(initialArray);

    return {
        count: () => array.get().length,
        getAll: () => array.get(),
        includes: (criteria) => {
            return keyName
                ? !!array.get().find(e => e[keyName] === criteria)
                : !!array.get().find(e => e === criteria);
        },
        findOne: (id) => {
            return keyName
                ? array.get().find(e => e[keyName] === id) || null
                : array.get().find(e => e === id) || null;
        },
        add: (element) => {
            array.update(arr => {
                arr.push(element);
                return arr;
            });
        },
        updateOne: (criteria, element) => {
            array.update(arr => {
                const stateElement = keyName
                    ? arr.find(e => e[keyName as keyof T] === criteria)
                    : arr.find(e => e === criteria);
                if (stateElement)
                    arr.splice(arr.indexOf(stateElement), 1, element);
                return arr;
            });
        },
        removeOne: (id) => {
            array.update(arr => {
                const element = keyName
                    ? arr.find(e => e[keyName as keyof T] === id)
                    : arr.find(e => e === id);
                if (element)
                    arr.splice(arr.indexOf(element), 1);
                return arr;
            });
        },
        drawFirst: () => {
            const first = array.get().length ? array.get()[0] : null;
            array.update(a => { a.shift(); return a; });
            return first;
        },
        overwrite: (newArr) => {
            array.set(newArr);
        },
        clear: () => array.set([]),
        reset: () => array.reset(),
    }
}
