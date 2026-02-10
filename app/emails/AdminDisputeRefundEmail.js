import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function AdminDisputeRefundEmail({
  order_reference = "",
  amount = "",
  reason = "",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`Refund initiated for order ${order_reference}`}>
      <Section>
        <Heading style={headingStyle}>Refund / Dispute Alert ⚠️</Heading>
        <Text style={introStyle}>
          A refund has been initiated and requires your attention.
        </Text>
        <Section style={cardStyle}>
          {order_reference ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Order:</strong> {order_reference}
            </Text>
          ) : null}
          {amount ? (
            <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
              <strong>Amount:</strong> GHS {amount}
            </Text>
          ) : null}
          {reason ? (
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Reason:</strong> {reason}
            </Text>
          ) : null}
        </Section>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            Review in Dashboard
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
