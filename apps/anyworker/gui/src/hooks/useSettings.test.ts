import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettings } from "./useSettings";
import * as api from "../api";

describe("useSettings save()", () => {
  beforeEach(() => {
    vi.spyOn(api, "getProviders").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({
      active: { provider: "anyrouter", model: "anyrouter/cowork" },
      configured: {},
    });
    vi.spyOn(api, "setActive").mockResolvedValue(undefined as unknown as void);
    vi.spyOn(api, "setProviderProfile").mockResolvedValue(undefined as unknown as void);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not touch the stored credentials when no apiKey/baseUrl was typed", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(api.getProviders).toHaveBeenCalled());

    await act(async () => {
      await result.current.save();
    });

    // Blank fields mean "keep what's already saved" — persisting them would
    // silently wipe out a previously stored key.
    expect(api.setProviderProfile).not.toHaveBeenCalled();
    expect(api.setActive).toHaveBeenCalledWith({
      provider: "anyrouter",
      model: "anyrouter/cowork",
      workspace: "",
    });
    expect(result.current.saveStatus).toBe("saved");
  });

  it("persists the profile once the user types an apiKey, then clears the field", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(api.getProviders).toHaveBeenCalled());

    act(() => result.current.setApiKey("sk-secret"));

    await act(async () => {
      await result.current.save();
    });

    expect(api.setProviderProfile).toHaveBeenCalledWith("anyrouter", {
      api_key: "sk-secret",
      base_url: "",
    });
    // The key must not linger in state after a successful save.
    expect(result.current.apiKey).toBe("");
    expect(result.current.saveStatus).toBe("saved");
  });

  it("returns false and sets saveError when persisting fails, without clearing the typed apiKey", async () => {
    vi.spyOn(api, "setActive").mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(api.getProviders).toHaveBeenCalled());

    act(() => result.current.setApiKey("sk-secret"));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    expect(result.current.saveStatus).toBe("error");
    expect(result.current.saveError).toBe("network down");
    // A failed save must not silently discard what the user typed.
    expect(result.current.apiKey).toBe("sk-secret");
  });
});
