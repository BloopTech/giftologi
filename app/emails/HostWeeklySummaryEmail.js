import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function HostWeeklySummaryEmail({
  host_name = "there",
  gifts_count = "0",
  views_count = "0",
  total_value = "0",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText="Your weekly registry summary is here!">
      <Section>
        <Heading style={headingStyle}>Weekly Registry Summary 📊</Heading>
        <Text style={introStyle}>
          Hi {host_name}, here&apos;s what happened with your registries this
          week.
        </Text>
        <Section style={cardStyle}>
          <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
            <strong>Gifts Purchased:</strong> {gifts_count}
          </Text>
          <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#374151" }}>
            <strong>Registry Views:</strong> {views_count}
          </Text>
          <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            <strong>Total Gift Value:</strong> GHS {total_value}
          </Text>
        </Section>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            Go to Dashboard
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
