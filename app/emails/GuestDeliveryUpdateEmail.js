import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function GuestDeliveryUpdateEmail({
  guest_name = "there",
  order_reference = "",
  status = "updated",
  tracking_url = "",
}) {
  return (
    <BaseLayout previewText={`Delivery update for order ${order_reference}`}>
      <Section>
        <Heading style={headingStyle}>Delivery Update 📦</Heading>
        <Text style={introStyle}>
          Hi {guest_name}, there&apos;s an update on your order.
        </Text>
        <Section style={cardStyle}>
          {order_reference ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Order:</strong> {order_reference}
            </Text>
          ) : null}
          <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            <strong>Status:</strong>{" "}
            <span style={{ textTransform: "capitalize" }}>{status}</span>
          </Text>
        </Section>
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
