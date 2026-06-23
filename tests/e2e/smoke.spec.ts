import { test, expect, type ConsoleMessage } from "@playwright/test";

const ROUTES = [
  { path: "/wallets", text: "Track any wallet" },
  { path: "/perps", text: "Perpetual Markets" },
  { path: "/radar", text: "Live Activity" },
  { path: "/cohorts", text: "Trader Cohorts" },
  { path: "/heatmap", text: "Position Heat Map" },
  { path: "/liquidations", text: "Recent Liquidations" },
];

function trackConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

for (const route of ROUTES) {
  test(`renders ${route.path} without console errors`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(route.path);
    await expect(page.getByText(route.text).first()).toBeVisible();
    // Sidebar + header present on every screen.
    await expect(page.getByRole("link", { name: "Wallet" })).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
}

test("redirects root to /wallets", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/wallets$/);
});

test("nav switches between screens", async ({ page }) => {
  await page.goto("/wallets");
  await page.getByRole("link", { name: "Perps" }).click();
  await expect(page).toHaveURL(/\/perps$/);
  await expect(
    page.getByText("Perpetual Markets", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Liquidations" }).click();
  await expect(page).toHaveURL(/\/liquidations$/);
});

test("header address search opens wallet detail", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/wallets");
  const addr = "0xfea8c4d2b1a09f8e7d6c5b4a39281706f5e4d3c2";
  const search = page.getByPlaceholder("Search address (0x…)");
  await search.fill(addr);
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(addr));
  await expect(page.getByText("ACCOUNT VALUE")).toBeVisible();
  await expect(page.getByText("Open Positions").first()).toBeVisible();
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("address autocomplete suggests and filters (case-insensitive)", async ({
  page,
}) => {
  await page.goto("/wallets");
  const input = page.getByPlaceholder(/^0x0000/);
  await input.click();
  // Dropdown shows top wallets on focus.
  await expect(page.getByText("TOP WALLETS")).toBeVisible();
  const firstOption = page.getByRole("option").first();
  await expect(firstOption).toBeVisible();
  const firstAddr = (await firstOption.textContent()) || "";
  // Type the 4 hex chars after "0x" of the first suggestion, uppercased.
  const frag = firstAddr.replace(/[^0-9a-fx…]/gi, "").slice(2, 6).toUpperCase();
  if (frag) {
    await input.fill(frag);
    await expect(page.getByRole("option")).toHaveCount(1);
  }
});

test("hot wallet row click opens detail", async ({ page }) => {
  await page.goto("/wallets");
  await expect(page.getByText("Hot Wallets").first()).toBeVisible();
  // First data row in the Hot Wallets table.
  await page.locator("text=/^0x[a-f0-9]{4}…[a-f0-9]{4}$/").first().click();
  await expect(page).toHaveURL(/\/wallets\/0x[a-f0-9]{40}$/);
  await expect(page.getByText("Recent Fills")).toBeVisible();
});
