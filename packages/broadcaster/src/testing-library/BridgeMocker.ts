import { BroadcasterBridge } from "../bridges/Bridge";
import { BroadcasterSubscription } from "../subscription/Subscription";

import { type BroadcasterError } from "../utils/Errors";
import type { BroadcasterMessage, BroadcasterStateMessage } from "../types";

enum MessageTypes {
    PUBLIC_MESSAGE,
    PRIVATE_MESSAGE,
}

type SerializedMessage<M, T> = {
    payload: M;
    type: T;
};

type SerializedPublicMessage<M> = SerializedMessage<M, MessageTypes.PUBLIC_MESSAGE>

type SerializedPrivateMessage<M> = SerializedMessage<M, MessageTypes.PRIVATE_MESSAGE>;

/**
 * **Bridge Mocker**
 *
 * IMPORTANT!: This Bridge is for testing purposes of Broadcaster class only!
 */
export class MockBridge<
    Payload extends BroadcasterMessage<unknown>,
    State,
> extends BroadcasterBridge<Payload, State> {
    private static subscriber = new BroadcasterSubscription<[
        SerializedPublicMessage<unknown> | SerializedPrivateMessage<unknown>
    ]>();

    /**
     * If set it will always response with provided error message
     */
    public static throwError: BroadcasterError | undefined;

    public connect(): void {
        MockBridge.subscriber.subscribe(this.extractMessageAndPush);
    }

    protected disconnect(): void {
        MockBridge.subscriber.close();
    }

    private extractMessageAndPush = (data: unknown): void => {
        const forceError = MockBridge.throwError;

        if (forceError) {
            this.pushErrorMessage(forceError);
        }
        else if (this.isPublicMessage(data)) {
            this.pushMessage(data.payload);
        }
        else if (this.isPrivateMessage(data)) {
            this.pushState(data.payload);
        }
        else {
            this.pushErrorMessage(data as BroadcasterError);
        }
    };

    private isMessage(data: unknown): data is SerializedMessage<unknown, unknown> {
        // data is an object
        if (typeof data === "object" &&
        !Array.isArray(data) &&
        data !== null) {
            // assert message is a valid SerializedMessage
            const message = data as SerializedMessage<unknown, unknown>;

            return (
                message["type"] !== undefined &&
                message["payload"] !== undefined
            );
        }

        return false;
    }

    private isPrivateMessage(data: unknown): data is SerializedPrivateMessage<BroadcasterStateMessage<State>> {
        return this.isMessage(data) && data.type === MessageTypes.PRIVATE_MESSAGE;
    }

    private isPublicMessage(data: unknown): data is SerializedPublicMessage<Payload> {
        return this.isMessage(data) && data.type === MessageTypes.PUBLIC_MESSAGE;
    }

    public postMessage(payload: Payload): void {
        const message:SerializedPublicMessage<Payload> = {
            payload,
            type: MessageTypes.PUBLIC_MESSAGE,
        };

        MockBridge.subscriber.next(message);
    }

    public setState(payload: BroadcasterStateMessage<State>): void {
        const message:SerializedPrivateMessage<BroadcasterStateMessage<State>> = {
            payload,
            type: MessageTypes.PRIVATE_MESSAGE,
        };

        MockBridge.subscriber.next(message);
    }

    public static reset(): void {
        MockBridge.subscriber.close();
    }
}
