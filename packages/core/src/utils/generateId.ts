/**
 * Generates pseudo-random IDs
 *
 * @returns
 */
export const generateId = (): `${string}-${string}-${string}` => {
    const timestamp = Date.now().toString(16);
    const timestampDerivedRandomNumber = (Date.now() *  Math.random()).toString(16).replace(".", "").slice(2);
    const salt = Math.random().toString(16).slice(2);

    return `${timestamp}-${timestampDerivedRandomNumber}-${salt}`;
};
