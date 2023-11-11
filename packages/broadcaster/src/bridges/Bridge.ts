import type { BroadcasterError } from "../utils/Errors";
import type { BroadcasterMessage, BroadcasterStateMessage } from "../types";

/**
 * Subscriptions catalogue used by Broadcaster to subscribe to a bridge
 *
 * @private
 */
type BroadcasterBridgeSubscriptions<Payload, State> = {
    /**
     * Subscribes to a message channel
     */
    messages?: (message: Payload) => void;

    /**
     * Triggered when error occurs
     */
    onError?: (error: BroadcasterError) => void;

    /**
     * Subscribes to a state channel
     */
    state?: (message: State) => void;
};

/**
 * **Broadcaster Bridge**
 *
 * Abstract class responsible for remote communication via serialized messages.
 * ____
 *
 * @private
 */
export abstract class BroadcasterBridge<Payload extends BroadcasterMessage<unknown>, State> {

    /**
     * Message, state and error subscriptions.
     */
    private subscriptions: BroadcasterBridgeSubscriptions<Payload, BroadcasterStateMessage<State>> = {};

    /**
     * Called when connection to a stream is required
     *
     * @param channelName
     */
    public abstract connect(channelName: string): void;

    /**
     * Disconnects from a stream and removes all subscriptions
     */
    public destroy(): void {
        this.subscriptions = {};
        this.disconnect();
    }

    /**
     * Teardown method called, when bridge will be destroyed
     */
    protected abstract disconnect(): void;

    /**
     * Sends a message to all broadcasters.
     *
     * @param message
     */
    public abstract postMessage(message: Payload): void;

    /**
     * Sends new error to a broadcaster via error subscription
     *
     * @param error BroadcasterError
     */
    protected readonly pushErrorMessage = (error: BroadcasterError): void => {
        this.subscriptions.onError?.(error);
    };

    /**
     * Sends new message to a broadcaster via message subscription
     *
     * @param message
     */
    protected readonly pushMessage = (message: Payload): void => {
        this.subscriptions.messages?.(message);
    };

    /**
     * Sends new state to a broadcaster via state subscription
     *
     * @param state
     */
    protected readonly pushState = (state: BroadcasterStateMessage<State>): void => {
        this.subscriptions.state?.(state);
    };

    /**
     * Notifies all broadcasters about state change in this instance.
     *
     * @param state
     */
    public abstract setState(state: BroadcasterStateMessage<State>): void;

    /**
     * Subscribes to a message, state and error stream.
     *
     * @param subscriptions catalogue of all subscriptions
     */
    public subscribe(subscriptions: BroadcasterBridgeSubscriptions<Payload, BroadcasterStateMessage<State>>): void {
        this.subscriptions = subscriptions;
    }
}
