import { BroadcasterSubscription } from "./Subscription";

describe("Subscription Manager tests", () => {
    const subscriptionManager = new BroadcasterSubscription<[string, Error | null]>();
    const result = jest.fn<undefined, [unknown, null | Error]>(() => undefined);
    const message = "Hello World";

    beforeEach(() => {
        subscriptionManager?.close();
        result.mockReset();
    });

    it("subscribes to a channel and sends a string message", () => {
        subscriptionManager.subscribe(result);
        subscriptionManager.next(message, new Error("Ooops"));

        expect(result.mock.calls.length).toBe(1);
        expect(result.mock.calls[0][0]).toBe(message);
        expect(result.mock.calls[0][1]).toBeInstanceOf(Error);
    });

    it("unsubscribes from a channel", () => {
        subscriptionManager.subscribe(result);
        subscriptionManager.unsubscribe(result);

        // try send a message - it should not be delivered
        subscriptionManager.next(message, null);

        // another way to unsubscribe
        const subscription = subscriptionManager.subscribe(result);
        subscription.unsubscribe();

        // try send a message - it should not be delivered
        subscriptionManager.next(message, null);

        // no message should be delivered
        expect(result.mock.calls.length).toBe(0);
    });

    it("closes channel and notifies subscribers", () => {
        subscriptionManager.subscribe(() => undefined, result);
        subscriptionManager.close();

        expect(result.mock.calls.length).toBe(1);
    });

    it("sends latest value on new subscription", () => {
        const replaySubscription = new BroadcasterSubscription<[string, Error | null]>(true);
        const replayedMessage = "REPLAY";
        replaySubscription.next(replayedMessage, null);

        replaySubscription.subscribe(result);

        expect(result.mock.calls.length).toBe(1);
        expect(result.mock.calls[0][0]).toBe(replayedMessage);
    });
});
