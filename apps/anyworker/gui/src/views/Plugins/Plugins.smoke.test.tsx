import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Plugins } from "./index";
import * as api from "../../api";

describe("Plugins view smoke test", () => {
  beforeEach(() => {
    vi.spyOn(api, "listPlugins").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the plugins list heading without crashing", async () => {
    render(<Plugins />);

    expect(screen.getByText("Skills & plugins")).toBeInTheDocument();
    await waitFor(() => expect(api.listPlugins).toHaveBeenCalled());
  });
});
