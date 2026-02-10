import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function VendorNewOrderEmail({
  vendor_name = "Vendor",
  order_reference = "",
  amount = "",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`New order received${order_reference ? `: ${order_reference}` : ""}!`}>
      <Section>
        <Heading style={headingStyle}>New Order Received 🛒</Heading>
        <Text style={introStyle}>
          Hi {vendor_name}, you have a new order!
        </Text>
        <Section style={cardStyle}>
          {order_reference ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Order Reference:</strong> {order_reference}
            </Text>
          ) : null}
          {amount ? (
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Amount:</strong> GHS {amount}
            </Text>
          ) : null}
        </Section>
        <Text style={introStyle}>
          Please review the order details and prepare for fulfillment.
        </Text>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Orders
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
