import { useLayoutEffect, useState } from "react";

import { Broadcaster, BroadcasterInstanceDescriptor, BroadcasterMessage } from "@broadcaster/core";

export type UseBroadcasterReturnType<Payload, State> = {
    /**
     * Channel name used for communication between broadcasters
     */
    channel:  Readonly<string>;
    /**
     * Broadcaster instance id
     */
    id: Readonly<string>;
    /**
     * Latest message
     */
    message: BroadcasterMessage<Payload> | null;
    /**
     * Sends a message to all broadcasters
     */
    postMessage: Broadcaster<Payload, State>["postMessage"];
    /**
     * Sets state of this broadcaster instance and notifies others.
     */
    setState: Broadcaster<Payload, State>["setState"];
    /**
     * Gets all states from all broadcaster instances with some metadata in it
     */
    state: BroadcasterInstanceDescriptor<State>[];
}

/**
 * Creates useBroadcaster hooks from provided Broadcaster instance
 *
 * @param broadcaster
 * @returns
 */
export const createUseBroadcaster = <Payload, State>(
    broadcaster: Broadcaster<Payload, State>,
) => (): UseBroadcasterReturnType<Payload, State> => {
    const [message, setMessage] = useState<BroadcasterMessage<Payload> | null>(null);
    const [state, setState] = useState<BroadcasterInstanceDescriptor<State>[]>(
        [] as unknown as BroadcasterInstanceDescriptor<State>[]
    );

    useLayoutEffect(() => {
        const subscriptions = [
            broadcaster.subscribe.message(setMessage),
            broadcaster.subscribe.state(setState),
        ];

        return (): void => {
            subscriptions.map((subscription) => subscription.unsubscribe());
        };
    }, []);

    return {
        id: broadcaster.id,
        state,
        message,
        channel: broadcaster.channel,
        setState: broadcaster.setState,
        postMessage: broadcaster.postMessage,
    };
};
