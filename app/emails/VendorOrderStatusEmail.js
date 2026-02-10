import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function VendorOrderStatusEmail({
  vendor_name = "Vendor",
  order_reference = "",
  status = "updated",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`Order ${order_reference} status: ${status}`}>
      <Section>
        <Heading style={headingStyle}>Order Status Update</Heading>
        <Text style={introStyle}>
          Hi {vendor_name}, there&apos;s been an update on one of your orders.
        </Text>
        <Section style={cardStyle}>
          {order_reference ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Order:</strong> {order_reference}
            </Text>
          ) : null}
          <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            <strong>New Status:</strong>{" "}
            <span style={{ textTransform: "capitalize" }}>{status}</span>
          </Text>
        </Section>
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
