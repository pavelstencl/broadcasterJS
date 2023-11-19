import { UseBroadcasterReturnType } from "./hooks/useBroadcaster";

export type ReactBroadcasterFactoryReturnType<
    Payload,
    Metadata,
> = {
    /**
     * **Broadcaster Hook**
     *
     * Allows to communicate with other Broadcaster instances using provided
     * Bridge. This hooks allows to read and push messages and get broadcasters state.
     *
     * _____
     *
     * @example```tsx
     * // Component displays messages as a list and allows to send a new message
     * const MessageComponent: FunctionComponent = () => {
     *     const {message, postMessage} = useBroadcaster();
     *     const [messages, setMessages] = useState([]);
     *
     *     useLayoutEffect(() => {
     *         setMessages((current) => [...current, message]);
     *     }, [message]);
     *
     *     return <div className="messages">
     *         {messages.map(({from, payload}) => <p>{from}: {payload}</p>)}
     *     </div>
     *     <button onClick={()=>postMessage(Date.now())}>Send Timestamp Message</button>
     * }
     * ```
     *
     * @param settings Broadcaster settings
     * @see{@link BroadcasterSettings}
     * @returns broadcaster hook
     */
    useBroadcaster: () => UseBroadcasterReturnType<Payload, Metadata>;
};
