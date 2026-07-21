import { randomUUID } from "crypto";

export const hasSquareConfig = Boolean(
  process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID
);

async function getSquareClient() {
  const { Client, Environment } = await import("square");
  return new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment:
      process.env.SQUARE_ENV === "production"
        ? Environment.Production
        : Environment.Sandbox,
  });
}

export async function createSquarePaymentLink({ client: billTo, lineItems, invoiceNumber, notes }) {
  if (!hasSquareConfig) throw new Error("Square not configured");

  const sq = await getSquareClient();

  // 1. Find or create Square customer (search by email, fall back to name)
  let customerId;
  if (billTo.email) {
    const searchResp = await sq.customersApi.searchCustomers({
      query: { filter: { emailAddress: { exact: billTo.email } } },
    });
    customerId = searchResp.result?.customers?.[0]?.id;
  }

  if (!customerId) {
    const createResp = await sq.customersApi.createCustomer({
      givenName: billTo.name.split(" ")[0] || billTo.name,
      familyName: billTo.name.split(" ").slice(1).join(" ") || undefined,
      emailAddress: billTo.email || undefined,
      phoneNumber: billTo.phone || undefined,
      idempotencyKey: randomUUID(),
    });
    customerId = createResp.result.customer.id;
  }

  // 2. Create order
  const orderResp = await sq.ordersApi.createOrder({
    order: {
      locationId: process.env.SQUARE_LOCATION_ID,
      lineItems: lineItems.map((item) => ({
        name: item.description,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: BigInt(Math.round(item.unitPrice * 100)),
          currency: "GBP",
        },
      })),
    },
    idempotencyKey: randomUUID(),
  });
  const orderId = orderResp.result.order.id;

  // 3. Create invoice — SHARE_MANUALLY gives us the public URL without Square
  //    sending its own email (we handle email ourselves with the PDF)
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const invoiceResp = await sq.invoicesApi.createInvoice({
    invoice: {
      locationId: process.env.SQUARE_LOCATION_ID,
      orderId,
      primaryRecipient: { customerId },
      invoiceNumber,
      title: `Invoice ${invoiceNumber} — SL Works Ltd`,
      description: notes || undefined,
      deliveryMethod: "SHARE_MANUALLY",
      paymentRequests: [
        { requestType: "BALANCE", dueDate },
      ],
      acceptedPaymentMethods: {
        card: true,
        squareGiftCard: false,
        bankAccount: false,
        buyNowPayLater: false,
      },
    },
    idempotencyKey: randomUUID(),
  });

  const inv = invoiceResp.result.invoice;

  // 4. Publish to activate the payment link (v39 API: positional args)
  const publishResp = await sq.invoicesApi.publishInvoice(
    inv.id,
    { version: inv.version, idempotencyKey: randomUUID() }
  );

  return {
    squareInvoiceId: publishResp.result.invoice.id,
    paymentUrl: publishResp.result.invoice.publicUrl,
  };
}
