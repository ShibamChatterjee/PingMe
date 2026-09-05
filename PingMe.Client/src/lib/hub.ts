import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { HUB_URL } from "./api";

export type ConnStatus = "connected" | "connecting" | "disconnected";

export class ChatHub {
  private conn: HubConnection;
  private _status: ConnStatus = "disconnected";
  private listeners = new Set<(s: ConnStatus) => void>();

  constructor(token: string) {
    this.conn = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.conn.onreconnecting(() => this.setStatus("connecting"));
    this.conn.onreconnected(() => this.setStatus("connected"));
    this.conn.onclose(() => this.setStatus("disconnected"));
  }

  private setStatus(s: ConnStatus) {
    this._status = s;
    this.listeners.forEach(l => l(s));
  }

  onStatusChange(cb: (s: ConnStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this._status);
    return () => this.listeners.delete(cb);
  }

  on(event: string, cb: (...args: unknown[]) => void) {
    this.conn.on(event, cb);
  }

  off(event: string, cb: (...args: unknown[]) => void) {
    this.conn.off(event, cb);
  }

  async start(): Promise<void> {
    if (this.conn.state !== HubConnectionState.Disconnected) return;
    this.setStatus("connecting");
    try {
      await this.conn.start();
      this.setStatus("connected");
    } catch (err) {
      this.setStatus("disconnected");
      throw err;
    }
  }

  async invoke(method: string, ...args: unknown[]): Promise<void> {
    if (this.conn.state !== HubConnectionState.Connected) return;
    try {
      await this.conn.invoke(method, ...args);
    } catch (err) {
      console.warn(`SignalR invoke "${method}" failed:`, err);
    }
  }

  /** Typed invoke for call-signaling methods — same as invoke but named for clarity. */
  async invokeCall(method: string, ...args: unknown[]): Promise<void> {
    return this.invoke(method, ...args);
  }

  /** Subscribe to a call-signaling event. Returns unsubscribe function. */
  onCall(event: string, cb: (payload: unknown) => void): () => void {
    this.conn.on(event, cb);
    return () => this.conn.off(event, cb);
  }

  get isConnected() {
    return this.conn.state === HubConnectionState.Connected;
  }

  async stop() {
    try {
      await this.conn.stop();
    } catch {}
    this.setStatus("disconnected");
  }
}
