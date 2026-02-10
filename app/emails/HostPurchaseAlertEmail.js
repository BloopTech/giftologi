import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function HostPurchaseAlertEmail({
  host_name = "there",
  buyer_name = "Someone",
  registry_title = "your registry",
  amount = "",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`New gift purchase for ${registry_title}!`}>
      <Section>
        <Heading style={headingStyle}>New Gift Purchase! 🎁</Heading>
        <Text style={introStyle}>
          Hi {host_name}, great news! {buyer_name} just purchased a gift from{" "}
          <strong>{registry_title}</strong>.
        </Text>
        {amount ? (
          <Section style={cardStyle}>
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Amount:</strong> {amount}
            </Text>
          </Section>
        ) : null}
        <Text style={introStyle}>
          Head to your dashboard to see the full details.
        </Text>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Registry Dashboard
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
