import { BroadcasterBridge, BroadcasterError, BroadcasterMessage, BroadcasterStateMessage } from "@broadcaster/core";
import { MockBridge } from "@broadcaster/testing-tools";
import { RenderHookResult, act, renderHook } from "@testing-library/react";

import { createBroadcaster } from ".";
import { ReactBroadcasterFactoryReturnType } from "./types";
import { UseBroadcasterReturnType } from "./hooks/useBroadcaster";

// CONFIG ---------------------------------

const channelName = "TEST_CHANNEL";

const createInstances = (
    amount: number
): ReactBroadcasterFactoryReturnType<unknown, Record<string, unknown>>[] => (
    new Array(amount).fill(0).map(() => {
        return createBroadcaster({
            channel:  channelName,
            bridge: new MockBridge() as unknown as BroadcasterBridge<BroadcasterMessage<unknown>, BroadcasterStateMessage<unknown>>,
            metadata: {},
        });
    })
);

// END CONFIG ------------------------------------

describe("createBroadcaster tests", () => {
    it("receives a message", () => {
        const [instance1, instance2] = createInstances(2);
        const message = "Hello World";

        const broadcaster1 = renderHook(() => instance1.useBroadcaster());
        const broadcaster2 = renderHook(() => instance2.useBroadcaster());

        // no message yet
        expect(broadcaster2.result.current.message).toBe(null);

        // send a message
        act(() => broadcaster1.result.current.postMessage(message));

        // message owner should not receive a message
        expect(broadcaster1.result.current.message).toBe(null);
        // receive message by second instance
        expect(broadcaster2.result.current.message?.payload).toBe(message);

        broadcaster1.unmount();
        broadcaster2.unmount();
    });

    it("propagates metadata change to all instances", () => {
        const [instance1, instance2] = createInstances(2);
        const newMetadata = {
            name: "John",
            lastname: "Doe",
        };

        const broadcaster1 = renderHook(() => instance1.useBroadcaster());
        const broadcaster2 = renderHook(() => instance2.useBroadcaster());

        // send a message
        act(() => broadcaster1.result.current.updateMetadata(newMetadata));

        /**
         * Find broadcaster1 state in other instance
         *
         * @param broadcaster
         * @returns
         */
        const getNewState = (
            broadcaster: RenderHookResult<UseBroadcasterReturnType<unknown, Record<string, unknown>>, unknown>,
        ): UseBroadcasterReturnType<unknown, Record<string, unknown>>["broadcasters"][0] | undefined  => {
            return broadcaster.result.current.broadcasters.find((state) => state.id === broadcaster1.result.current.id);
        };

        // owner receives new state as well
        expect(getNewState(broadcaster1)?.metadata).toStrictEqual(newMetadata);
        // receive message by second instance
        expect(getNewState(broadcaster2)?.metadata).toStrictEqual(newMetadata);

        broadcaster1.unmount();
        broadcaster2.unmount();
    });

    it("receives an error without disconnecting from a broadcast stream", () => {
        const [instance1, instance2] = createInstances(2);
        MockBridge.throwError = new BroadcasterError("TEST", "Error");
        const message = "Message";

        const broadcaster1 = renderHook(() => instance1.useBroadcaster());
        const broadcaster2 = renderHook(() => instance2.useBroadcaster());

        act(() => broadcaster1.result.current.postMessage("Should not be delivered"));

        // should display MockBridge.throwError message
        expect(broadcaster2.result.current.error).toBe(MockBridge.throwError);
        // original message should not be delivered
        expect(broadcaster2.result.current.message).toBe(null);

        MockBridge.throwError = undefined;

        act(() => broadcaster1.result.current.postMessage(message));

        // message should be delivered
        expect(broadcaster2.result.current.message?.payload).toBe(message);

        broadcaster1.unmount();
        broadcaster2.unmount();
    });
});
