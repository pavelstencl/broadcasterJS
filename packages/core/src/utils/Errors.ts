/**
 * **BroadcasterError**
 *
 * Represents expected errors from Broadcaster itself or from a Bridge.
 *
 * @public
 */
export class BroadcasterError extends Error {
    /**
     * Error type unique identifier
     */
    public readonly errorType: string;

    public constructor(errorType: string, message: string, stack?: string) {
        super(message);
        this.errorType = errorType;

        if (stack) {
            this.stack = `[BROADCASTER_ERROR:${errorType}]: ${message} \n ${stack}`;
        }
    }

    /**
     * Validates whether unknown error is instance of BroadcasterError and has same errorType.
     * @param err
     * @returns
     */
    public isSameErrorTypeAs(err: unknown): boolean {
        return err instanceof BroadcasterError && err.errorType === this.errorType;
    }
}

/**
 * Bridge received unexpected payload as a response.
 */
export class BroadcasterContentTypeMismatchError extends BroadcasterError {
    public constructor(public readonly payload?: unknown) {
        super("CONTENT_TYPE_MISMATCH", "Broadcaster Bridge received invalid message.");
    }
}
