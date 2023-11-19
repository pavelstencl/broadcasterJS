import { BroadcasterError } from "./Errors";

const UNKNOWN_ERROR = "Unknown error occurred in Broadcaster instance. This means, that something went wrong without proper output.";

/**
 * Transforms unknown error into BroadcasterError instance
 * @param errorType BroadcasterError error type string
 * @param error unknown error
 */
export const transformIntoBroadcasterError = (
    errorType: string,
    error: unknown
): BroadcasterError => {
    try {
        if (!error) {
            throw null;
        }
        else if (typeof error === "string" || typeof error === "number") {
            return new BroadcasterError(errorType, `${error}`);
        }
        else if (typeof error === "object") {
            const errorObject = error as Record<string, unknown>;

            if (errorObject["message"]) {
                return new BroadcasterError(
                    errorType,
                    errorObject["message"] as string,
                    errorObject["stack"] as string | undefined
                );
            }
            else if (error["toString"]) {
                return new BroadcasterError(errorType, error["toString"]());
            }
            else {
                throw error;
            }
        }

        throw error;
    }
    catch (_) {
        return new BroadcasterError(errorType, UNKNOWN_ERROR);
    }
};
