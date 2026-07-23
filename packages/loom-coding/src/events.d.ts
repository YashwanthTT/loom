declare module "events" {
  class EventEmitter<TEvents extends Record<string, unknown[]> = Record<string, unknown[]>> {
    on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    addListener<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    removeListener<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): boolean
    once<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    removeAllListeners(event?: keyof TEvents): this
    listenerCount(event: keyof TEvents): number
    listeners(event: keyof TEvents): Function[]
    eventNames(): (keyof TEvents)[]
    setMaxListeners(n: number): this
    getMaxListeners(): number
    prependListener<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    prependOnceListener<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): this
    rawListeners(event: keyof TEvents): Function[]
  }

  export { EventEmitter }
}
