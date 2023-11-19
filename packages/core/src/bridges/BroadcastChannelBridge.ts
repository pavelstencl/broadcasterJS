import { BroadcasterBridge } from "./Bridge";
import { BroadcasterContentTypeMismatchError, BroadcasterError } from "../utils/Errors";
import { BroadcasterMessage, BroadcasterStateMessage } from "../types";
import { transformIntoBroadcasterError } from "../utils/transformIntoBroadcasterError";

enum MessageTypes {
    MESSAGE,
    STATE,
}

type SerializedMessage<M, T> = {
    payload: M;
    type: T;
};

type SerializedPublicMessage<M> = SerializedMessage<M, MessageTypes.MESSAGE>

type SerializedPrivateMessage<M> = SerializedMessage<M, MessageTypes.STATE>;

/**
 * **BroadcastChannel Bridge: Serverless browsing context bridge**
 *
 * Communicates with other Broadcaster instances via
 * [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).
 *
 * BroadcastChannel API allows to communicate with different browsing contexts inside a browser
 * (tabs, window, workers, etc..) without need of a server.
 *
 * ____
 *
 * Minimal requirements:
 *
 * | Chromium | Edge | Safari | Firefox |
 * |:--------:|:----:|:------:|:-------:|
 * |    54    |  79  |  15.4  |    38   |
 */
export class BroadcastChannelBridge<
    Payload,
    Metadata,
> extends BroadcasterBridge<Payload, Metadata> {
    /**
     * Instance of BroadcastChannel API.
     */
    private messageChannel!: BroadcastChannel;

    /**
     * Channel used as identifier for communication
     */
    private channelName!: string;

    /**
     * Connects to a BroadcasterChannel stream
     *
     * @param channelName communication identifier
     */
    public connect(channelName: string): void {
        this.channelName = channelName;
        this.messageChannel = new BroadcastChannel(this.channelName);

        // subscribe to BroadcastChannel API
        this.messageChannel.addEventListener(
            "message",
            this.extractMessageAndPush,
        );
        this.messageChannel.addEventListener(
            "messageerror",
            (event) => {
                this.pushErrorMessage(
                    new BroadcasterError(
                        "BROADCAST_CHANNEL_DESERIALIZE_ERROR",
                        `Broadcast channel cannot deserialize incoming message: \n
                        Data Type: ${typeof event.data} 
                        `
                    ),
                );
            }
        );
    }

    protected disconnect(): void {
        // Unsubscribe from BroadcasterChannel API
        this.messageChannel.removeEventListener("message", this.extractMessageAndPush);
        this.messageChannel.close();
    }

    /**
     * Sort incoming messages and push it to corresponding stream
     *
     * @param event BroadcasterChannel Event
     */
    private extractMessageAndPush = (
        event: MessageEvent<
        SerializedPublicMessage<BroadcasterMessage<Payload>> | SerializedPrivateMessage<BroadcasterStateMessage<Metadata>>
        >
    ): void => {
        const data = event.data;

        if (this.isPublicMessage(data)) {
            this.pushMessage(data.payload);
        }
        else if (this.isStateChangeMessage(data)) {
            this.pushState(data.payload);
        }
        else {
            this.pushErrorMessage(new BroadcasterContentTypeMismatchError(data));
        }
    };

    /**
     * Wraps action to try catch, and in case of an error,
     * it will transform it to BroadcastError and push it to subscribers
     *
     * @param action callback action, which will be called inside try scope
     */
    private guardPostMessageErrors = (
        action: () => void,
    ): void => {
        try {
            action();
        }
        catch (error) {
            this.pushErrorMessage(transformIntoBroadcasterError("BROADCAST_CHANNEL_POST_MESSAGE_ERROR", error));
        }
    };

    /**
     * Incoming message is a valid BroadcastChannelBridge message
     *
     * @param data
     * @returns
     */
    private isMessage(data: unknown): data is SerializedMessage<unknown, unknown> {
        // data is an object
        if (
            typeof data === "object" &&
            !Array.isArray(data) &&
            data !== null
        ) {
            // assert message is a valid SerializedMessage
            const message = data as SerializedMessage<unknown, unknown>;

            return (
                message.type !== undefined
            );
        }

        return false;
    }

    /**
     * A BroadcasterChannel message is a public message
     *
     * @param data
     * @returns
     */
    private isPublicMessage(data: unknown): data is SerializedPublicMessage<Payload> {
        return this.isMessage(data) && data.type === MessageTypes.MESSAGE;
    }

    /**
     * A BroadcasterChannel message is a state change message
     *
     * @param data
     * @returns
     */
    private isStateChangeMessage(data: unknown): data is SerializedPrivateMessage<Metadata> {
        return this.isMessage(data) && data.type === MessageTypes.STATE;
    }

    /**
     * Sends public message to all BroadcasterChannelBridge instances
     *
     * @param payload
     */
    public postMessage(payload: Payload): void {
        const message:SerializedPublicMessage<Payload> = {
            payload,
            type: MessageTypes.MESSAGE
        };

        this.guardPostMessageErrors(() => this.messageChannel.postMessage(message));
    }

    /**
     * Sends new state of this instance to all BroadcasterChannelBridge instances
     *
     * @param payload
     */
    public setState(payload: Metadata): void {
        const message:SerializedPrivateMessage<Metadata> = {
            payload,
            type: MessageTypes.STATE
        };

        this.guardPostMessageErrors(() => this.messageChannel.postMessage(message));
    }
}
