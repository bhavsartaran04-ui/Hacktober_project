import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { extractLabel, fetchResult, fetchSoil } from "./services/api.js";

vi.mock("./services/api.js", () => ({
  extractLabel: vi.fn(),
  fetchResult: vi.fn(),
  fetchSoil: vi.fn(),
}));

vi.mock("./services/speech.js", () => ({
  getSpeechSupport: () => true,
  speakText: () => ({ ok: true }),
  stopSpeaking: vi.fn(),
}));

const ocrResult = (productName) => ({
  ok: true,
  isDemo: false,
  ocr: { text: `Product name: ${productName}\nDose: 2 ml per litre of water`, confidence: 92, lowConfidence: false },
  fields: {
    productName: { status: "found", value: productName, snippet: `Product name: ${productName}` },
    activeIngredient: { status: "not found", value: "", snippet: "" },
    targetCrop: { status: "not found", value: "", snippet: "" },
    targetPest: { status: "not found", value: "", snippet: "" },
    rate: { status: "found", amount: 2, unit: "ml", perAmount: 1, perUnit: "litre", value: "2 ml per 1 litre", snippet: "2 ml per litre" },
    phi: { status: "found", value: "7 days", snippet: "PHI: 7 days" },
    reEntry: { status: "found", value: "24 hours", snippet: "Re-entry interval: 24 hours" },
    precautions: { status: "found", value: "Wear gloves.", snippet: "Wear gloves." },
    mixing: { status: "not found", value: "Could not verify", snippet: "" },
    tankInstructions: { status: "not found", value: "", snippet: "" },
    firstAid: { status: "not found", value: "", snippet: "" },
    warnings: { status: "not found", value: "", snippet: "" },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchSoil.mockResolvedValue({
    ok: true, texture: "Loam", clayPercent: 22, sandPercent: 40,
    estimate: "Nearest mapped sample about 10 km away.",
    source: "ISRIC SoilGrids", sourceUrl: "https://soilgrids.org/",
  });
  fetchResult.mockResolvedValue({
    ok: true,
    calculation: { ok: true, quantity: 20, unit: "ml", conversionLines: [] },
    llm: { ok: false, error: "not configured" },
    mixing: { status: "not found", value: "Could not verify" },
    soil: { ok: true, texture: "Loam", clayPercent: 22, sandPercent: 40, estimate: "Nearest mapped sample about 10 km away.", source: "ISRIC SoilGrids", sourceUrl: "https://soilgrids.org/" },
  });
});
afterEach(cleanup);

async function uploadPhoto(user, name = "label.png") {
  const input = document.querySelector('input[type="file"]');
  await user.upload(input, new File(["fake image bytes"], name, { type: "image/png" }));
}

describe("Pesticide label reader flow", () => {
  it("requires state, supports crop types, confirms OCR, calculates, and keeps tank on back navigation", async () => {
    const user = userEvent.setup();
    extractLabel.mockResolvedValue(ocrResult("Sample Product"));
    render(<App />);

    expect(screen.queryByRole("button", { name: /demo/i })).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Farm state"), "Maharashtra");
    await waitFor(() => expect(fetchSoil).toHaveBeenCalledWith("Maharashtra"));
    await user.selectOptions(screen.getByLabelText("What are you growing?"), "kharif");
    await uploadPhoto(user);

    expect(await screen.findByText("Check what we read")).toBeTruthy();
    expect(screen.getByText(/Original text read from the photo/)).toBeTruthy();
    await user.clear(screen.getByLabelText(/Product amount/));
    await user.type(screen.getByLabelText(/Product amount/), "3");
    await user.click(screen.getByLabelText(/I checked the extracted fields/));
    await user.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await user.click(screen.getByRole("button", { name: /10 litres/ }));
    await user.click(screen.getByRole("button", { name: "Show Result" }));

    expect(await screen.findByText("Result")).toBeTruthy();
    expect(screen.getByText("20 ml")).toBeTruthy();
    expect(screen.getByText(/Maharashtra: Loam/)).toBeTruthy();
    expect(screen.getByText(/Rainy season \(Kharif\)/)).toBeTruthy();
    expect(fetchResult.mock.calls[0][0].state).toBe("Maharashtra");
    expect(fetchResult.mock.calls[0][0].crop).toBe("kharif");
    expect(fetchResult.mock.calls[0][0].fields.rate.amount).toBe("3");

    await user.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByRole("button", { name: /10 litres/ }).className).toContain("active");
  });

  it("clears the old product when the farmer starts another photo", async () => {
    const user = userEvent.setup();
    extractLabel
      .mockResolvedValueOnce(ocrResult("First Product"))
      .mockResolvedValueOnce(ocrResult("Second Product"));
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Farm state"), "Punjab");
    await waitFor(() => expect(fetchSoil).toHaveBeenCalled());
    await uploadPhoto(user);
    expect(await screen.findByText("Check what we read")).toBeTruthy();
    await user.click(screen.getByLabelText(/I checked the extracted fields/));
    await user.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await user.click(screen.getByRole("button", { name: /10 litres/ }));
    await user.click(screen.getByRole("button", { name: "Show Result" }));
    await user.click(await screen.findByRole("button", { name: "🔄 New Photo" }));
    await uploadPhoto(user, "next.png");
    expect(await screen.findByDisplayValue("Second Product")).toBeTruthy();
  });

  it("surfaces English or Hindi speech controls without changing label values", async () => {
    const user = userEvent.setup();
    extractLabel.mockResolvedValue(ocrResult("Sample Product"));
    render(<App />);
    await user.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(screen.getByText("आपका राज्य")).toBeTruthy();
    expect(screen.getByText("कैमरा या गैलरी खोलने के लिए दबाएँ")).toBeTruthy();
  });
});
