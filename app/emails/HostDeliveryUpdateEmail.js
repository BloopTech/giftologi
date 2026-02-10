import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function HostDeliveryUpdateEmail({
  host_name = "there",
  order_reference = "",
  status = "updated",
  registry_title = "your registry",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`Delivery update for order ${order_reference}`}>
      <Section>
        <Heading style={headingStyle}>Delivery Update 📦</Heading>
        <Text style={introStyle}>
          Hi {host_name}, there&apos;s an update on a gift order for{" "}
          <strong>{registry_title}</strong>.
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
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Order Details
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
