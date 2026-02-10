import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function VendorPayoutStatusEmail({
  vendor_name = "Vendor",
  payout_status = "pending",
  amount = "",
  dashboard_url = "",
}) {
  const statusMessages = {
    pending: "Your payout has been initiated and is being processed.",
    completed: "Your payout has been completed successfully!",
    rejected: "Unfortunately, your payout request was rejected.",
  };

  const message = statusMessages[payout_status] || `Your payout status is now: ${payout_status}.`;

  return (
    <BaseLayout previewText={`Payout update: ${payout_status}`}>
      <Section>
        <Heading style={headingStyle}>Payout Update 💰</Heading>
        <Text style={introStyle}>Hi {vendor_name}, {message}</Text>
        {amount ? (
          <Section style={cardStyle}>
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Amount:</strong> GHS {amount}
            </Text>
          </Section>
        ) : null}
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Payouts
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
