type GenericSubscriberCallback<P extends Array<unknown>> = (...args: P) => void;

type Subscriber<CallbackArguments extends Array<unknown>> = {
    next: GenericSubscriberCallback<CallbackArguments>;
    onComplete: GenericSubscriberCallback<never[]> | undefined;
}

type Subscription = {
    unsubscribe: () => void;
}

/**
 * **Broadcaster Subscription**
 *
 * Manages subscriptions and life cycle of all subscribers.
 *
 * @private
 * @param CallbackArguments type definition of a subscriber callback arguments
 */
export class BroadcasterSubscription<CallbackArguments extends Array<unknown>> {
    /**
     * List of all currently active subscribers
     */
    private subscribers: Subscriber<CallbackArguments>[] = [];

    /**
     * When shareReplay is true, it will store the latest value
     */
    private buffer?: CallbackArguments;

    /**
     * If true, it will resend the latest message to a new subscriber
     */
    private shareReplay = false;

    public constructor(shareReplay?: boolean) {
        this.shareReplay = !!shareReplay;
    }

    /**
     * Close channel and notify subscribers
     */
    public close = (): void => {
        this.subscribers.forEach(({ onComplete }) => onComplete?.());
        this.subscribers = [];
    };

    /**
     * Push a payload to all subscribers.
     *
     * @param args subscriber callback attributes
     */
    public next: GenericSubscriberCallback<CallbackArguments> = (...args): void => {
        // update buffer if needed
        if (this.shareReplay) {
            this.buffer = args;
        }

        this.subscribers.forEach(({ next }) => next(...args));
    };

    /**
     * Subscribes to a channel
     *
     * @param callback method called every time new payload occurs.
     * @param complete method called, when channel is closed
     * @returns subscription info object with teardown function
     */
    public subscribe = (callback: Subscriber<CallbackArguments>["next"], complete?: Subscriber<CallbackArguments>["onComplete"]): Subscription => {
        this.subscribers = [...this.subscribers, {
            next: callback,
            onComplete: complete,
        }];

        // send the latest value from buffer if exits
        if (this.buffer) {
            callback(...this.buffer);
        }

        return {
            unsubscribe: () => this.unsubscribe(callback),
        };
    };

    /**
     * Unsubscribes from a channel
     *
     * @param callback
     */
    public unsubscribe = (callback: GenericSubscriberCallback<CallbackArguments>): void => {
        this.subscribers = this.subscribers.filter(({ next }) => next !== callback);
    };
}
