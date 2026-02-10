import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function HostThankYouReminderEmail({
  host_name = "there",
  pending_count = "1",
  dashboard_url = "",
}) {
  const label =
    pending_count === "1" ? "1 gift" : `${pending_count} gifts`;

  return (
    <BaseLayout previewText={`You have ${label} awaiting a thank-you note`}>
      <Section>
        <Heading style={headingStyle}>Time to Say Thanks 💛</Heading>
        <Text style={introStyle}>
          Hi {host_name}, you have <strong>{label}</strong> that haven&apos;t
          received a thank-you note yet.
        </Text>
        <Section style={cardStyle}>
          <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            A personal thank-you goes a long way! Let your gifters know how
            much their generosity means to you.
          </Text>
        </Section>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            Send Thank-You Notes
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
