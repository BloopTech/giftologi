import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function GuestOrderConfirmationEmail({
  guest_name = "there",
  order_reference = "",
  amount = "",
  registry_title = "",
  tracking_url = "",
}) {
  return (
    <BaseLayout previewText={`Order confirmed: ${order_reference}`}>
      <Section>
        <Heading style={headingStyle}>Order Confirmed! 🎉</Heading>
        <Text style={introStyle}>
          Hi {guest_name}, thank you for your purchase
          {registry_title ? ` from ${registry_title}` : ""}!
        </Text>
        <Section style={cardStyle}>
          {order_reference ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Order Reference:</strong> {order_reference}
            </Text>
          ) : null}
          {amount ? (
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Total:</strong> GHS {amount}
            </Text>
          ) : null}
        </Section>
        <Text style={introStyle}>
          We&apos;ll send you updates as your order is processed and shipped.
        </Text>
      </Section>
      {tracking_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={tracking_url} style={buttonStyle}>
            Track Your Order
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
