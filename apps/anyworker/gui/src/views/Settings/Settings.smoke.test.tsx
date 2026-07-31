import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./index";
import * as api from "../../api";

describe("Settings view smoke test", () => {
  beforeEach(() => {
    vi.spyOn(api, "getAnyRouterAccount").mockResolvedValue({ signed_in: false });
    vi.spyOn(api, "getModelCatalog").mockResolvedValue({ models: [], top: [], recommended: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the settings tabs without crashing", async () => {
    render(
      <Settings
        providers={[]}
        provider="anyrouter"
        onProviderChange={vi.fn()}
        model="anyrouter/cowork"
        onModelChange={vi.fn()}
        apiKey=""
        onApiKeyChange={vi.fn()}
        baseUrl=""
        onBaseUrlChange={vi.fn()}
        saveStatus="idle"
        saveError={null}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    await waitFor(() => expect(api.getAnyRouterAccount).toHaveBeenCalled());
    await waitFor(() => expect(api.getModelCatalog).toHaveBeenCalled());
  });
});
