import { useLayoutEffect, useState } from "react";

import { Broadcaster, BroadcasterInstanceDescriptor, BroadcasterMessage } from "@broadcaster/core";
import { DeepReadonly } from "utility-types";

export type UseBroadcasterReturnType<Payload, State> = {
    /**
     * Channel name used for communication between broadcasters
     */
    channel:  Readonly<string>;
    /**
     * Broadcaster instance id
     */
    id: string;
    /**
     * Latest message
     */
    message: DeepReadonly<BroadcasterMessage<Payload>> | null;
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
    state: DeepReadonly<BroadcasterInstanceDescriptor<State>[]>;
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
    const [message, setMessage] = useState<DeepReadonly<BroadcasterMessage<Payload>> | null>(null);
    const [state, setState] = useState<DeepReadonly<BroadcasterInstanceDescriptor<State>[]>>(
        [] as unknown as DeepReadonly<BroadcasterInstanceDescriptor<State>[]>
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
