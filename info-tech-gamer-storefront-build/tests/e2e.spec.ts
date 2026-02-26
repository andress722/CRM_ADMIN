import { test, expect, type Route } from "@playwright/test"

const SEARCH_PRODUCTS = {
  items: [
    { id: "gpu-1", name: "RTX 5090", price: 1999.9, category: "GPUs" },
    { id: "kb-1", name: "Mech Keyboard", price: 129.9, category: "Peripherals" },
  ],
  total: 2,
}

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 9.9,
    interval: "month",
    features: ["Community perks"],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.9,
    interval: "month",
    features: ["Free shipping", "Priority support"],
    highlighted: true,
  },
]

const CART_LOCAL_STORAGE = JSON.stringify([
  {
    product: {
      id: "gpu-1",
      name: "RTX 5090",
      price: 1999.9,
      category: "GPUs",
    },
    quantity: 1,
  },
])

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()

    if (method === "GET" && pathname.endsWith("/products/search")) {
      await fulfillJson(route, SEARCH_PRODUCTS)
      return
    }

    if (method === "GET" && pathname.endsWith("/products")) {
      await fulfillJson(route, SEARCH_PRODUCTS.items)
      return
    }

    if (method === "GET" && pathname.endsWith("/recommendations")) {
      await fulfillJson(route, [])
      return
    }

    if (method === "GET" && pathname.endsWith("/subscriptions/plans")) {
      await fulfillJson(route, SUBSCRIPTION_PLANS)
      return
    }

    if (method === "POST" && pathname.endsWith("/orders/from-cart")) {
      await fulfillJson(route, { id: "ord-1", totalAmount: 1999.9 })
      return
    }

    if (method === "POST" && pathname.endsWith("/payments/checkout")) {
      await fulfillJson(route, {})
      return
    }

    if (method === "POST" && pathname.endsWith("/support/tickets")) {
      await fulfillJson(route, { id: "ticket-1" }, 201)
      return
    }

    await fulfillJson(route, {})
  })
})

test("home renders catalog from API", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Browse Catalog" })).toBeVisible()
  await expect(page.getByText("RTX 5090")).toBeVisible()
  await expect(page.getByText("Mech Keyboard")).toBeVisible()
})

test("cart shows empty state when no items", async ({ page }) => {
  await page.goto("/cart")

  await expect(page.getByRole("heading", { name: "Cart is Empty" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Browse Catalog" })).toBeVisible()
})

test("checkout submits order from cart", async ({ page }) => {
  await page.addInitScript((payload) => {
    window.localStorage.setItem("infotechgamer-cart", payload)
  }, CART_LOCAL_STORAGE)

  await page.goto("/checkout")

  await page.getByLabel("Full Name").fill("Benyamin QA")
  await page.getByLabel("Street Address").fill("123 Main St")
  await page.getByLabel("City").fill("Austin")
  await page.getByLabel("State").fill("TX")
  await page.getByLabel("ZIP Code").fill("78701")
  await page.getByRole("button", { name: "Place Order" }).click()

  await expect(page.getByRole("heading", { name: "Order Confirmed" })).toBeVisible()
})

test("account page exposes sign in flow", async ({ page }) => {
  await page.goto("/account")

  await expect(page.getByRole("heading", { name: "Access Your Account" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign In" }).first()).toBeVisible()
})

test("subscriptions render plans from API", async ({ page }) => {
  await page.goto("/subscriptions")

  await expect(page.getByRole("heading", { name: "Membership Plans" })).toBeVisible()
  await expect(page.getByText("Starter")).toBeVisible()
  await expect(page.getByText("Pro")).toBeVisible()
})

test("support form submits ticket", async ({ page }) => {
  await page.goto("/support")

  await page.getByLabel("Email").fill("user@example.com")
  await page.getByLabel("Subject").fill("Need help")
  await page.getByLabel("Message").fill("My order tracking has not updated yet.")
  await page.getByRole("button", { name: "Submit Ticket" }).click()

  await expect(page.getByRole("heading", { name: "Ticket Submitted" })).toBeVisible()
})
