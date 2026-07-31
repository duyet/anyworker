import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStream } from "./useSessionStream";
import * as api from "../api";

/** Minimal fake WebSocket that lets tests drive onopen/onmessage/onclose by
 * hand, and records what the hook sends/closes. Every `new WebSocket(...)`
 * call is captured in `instances` so a test can grab "the socket the hook
 * currently holds". */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = 1; // OPEN
  sent: unknown[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
    this.onclose?.();
  }

  /** Test helper: simulate the server pushing a wire event. */
  emit(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe("useSessionStream", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
    vi.spyOn(api, "getMessages").mockResolvedValue([]);
    vi.spyOn(api, "resolveApproval").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function currentSocket() {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  it("appends text_delta events onto the trailing assistant item instead of creating a new one each time", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "text_delta", payload: { text: "Hel" } }));
    act(() => ws.emit({ type: "text_delta", payload: { text: "lo" } }));

    // A naive reducer that appended a new item per event would show two
    // bubbles; the real behaviour must merge deltas into one running reply.
    expect(result.current.items).toEqual([{ kind: "assistant", text: "Hello" }]);
  });

  it("starts a new assistant item when text follows a non-assistant item", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "text", payload: { text: "hi" } }));
    act(() => result.current.sendUserMessage("question"));
    act(() => ws.emit({ type: "text", payload: { text: "answer" } }));

    expect(result.current.items).toEqual([
      { kind: "assistant", text: "hi" },
      { kind: "user", text: "question" },
      { kind: "assistant", text: "answer" },
    ]);
  });

  it("pairs tool_start with tool_end on the same item rather than appending a separate end item", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "tool_start", payload: { name: "ReadFile" } }));
    act(() => ws.emit({ type: "tool_end", payload: { name: "ReadFile", result: "done" } }));

    expect(result.current.items).toEqual([
      { kind: "tool", name: "ReadFile", status: "end", result: "done" },
    ]);
  });

  it("ignores a tool_end that has no matching preceding tool_start", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "tool_end", payload: { name: "ReadFile", result: "done" } }));

    expect(result.current.items).toEqual([]);
  });

  it("turns permission_required into an approval item carrying id, tool, reason and args", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() =>
      ws.emit({
        type: "permission_required",
        id: "approval-1",
        payload: { tool_name: "Bash", reason: "runs a shell command", arguments: { cmd: "ls" } },
      }),
    );

    expect(result.current.items).toEqual([
      {
        kind: "approval",
        id: "approval-1",
        tool: "Bash",
        reason: "runs a shell command",
        args: { cmd: "ls" },
      },
    ]);
  });

  it("turns error events into an error item with the server message", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "error", payload: { message: "boom" } }));

    expect(result.current.items).toEqual([{ kind: "error", text: "boom" }]);
  });

  it("captures an artifact from a WriteFile tool_end result", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "tool_start", payload: { name: "WriteFile" } }));
    act(() =>
      ws.emit({
        type: "tool_end",
        payload: { name: "WriteFile", result: JSON.stringify({ ok: true, path: "/tmp/report.md" }) },
      }),
    );

    expect(result.current.artifacts).toEqual([{ name: "report.md", kind: "File", content: "" }]);
  });

  it("does not record an artifact when the WriteFile result JSON is malformed", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "tool_start", payload: { name: "WriteFile" } }));
    // Malformed JSON must be swallowed, not crash the reducer or leave a
    // phantom artifact behind.
    act(() => ws.emit({ type: "tool_end", payload: { name: "WriteFile", result: "{not json" } }));

    expect(result.current.artifacts).toEqual([]);
    expect(result.current.items).toEqual([
      { kind: "tool", name: "WriteFile", status: "end", result: "{not json" },
    ]);
  });

  it("does not record an artifact when the WriteFile result reports ok: false", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.emit({ type: "tool_start", payload: { name: "WriteFile" } }));
    act(() =>
      ws.emit({
        type: "tool_end",
        payload: { name: "WriteFile", result: JSON.stringify({ ok: false, error: "denied" }) },
      }),
    );

    expect(result.current.artifacts).toEqual([]);
  });
});

describe("useSessionStream reconnect", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
    vi.spyOn(api, "getMessages").mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function currentSocket() {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  it("schedules a reconnect with growing backoff after an unexpected close, opening a new socket", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const first = currentSocket();
    expect(FakeWebSocket.instances).toHaveLength(1);

    // Server drops the connection unexpectedly (not via closeSocket()).
    act(() => first.onclose?.());
    expect(result.current.connectionState).toBe("reconnecting");

    // Advance past the maximum possible first-attempt delay (base * 2^0 capped,
    // full jitter so it's <= RECONNECT_BASE_MS). A second socket must appear.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("does not reconnect after an intentional close (e.g. switching sessions)", async () => {
    const { result } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    expect(FakeWebSocket.instances).toHaveLength(1);

    // openNewSession("s2") closes the s1 socket intentionally before opening
    // a fresh one for s2 — that intentional close must never trigger a
    // reconnect attempt for s1.
    await act(async () => {
      result.current.openNewSession("s2");
    });
    // One close (s1) + one open (s2) => exactly 2 sockets total, not 3.
    expect(FakeWebSocket.instances).toHaveLength(2);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("stops updating state after the component unmounts, even if a reconnect timer was pending", async () => {
    const { result, unmount } = renderHook(() => useSessionStream());
    await act(async () => {
      result.current.openNewSession("s1");
    });
    const ws = currentSocket();

    act(() => ws.onclose?.());
    expect(result.current.connectionState).toBe("reconnecting");

    unmount();

    // If the pending reconnect timer fired and touched state after unmount,
    // React would warn and a new socket would leak into existence.
    const before = FakeWebSocket.instances.length;
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(FakeWebSocket.instances.length).toBe(before);
  });
});
