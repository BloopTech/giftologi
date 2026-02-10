import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function HostEventReminderEmail({
  host_name = "there",
  event_title = "your event",
  days_until = "7",
  dashboard_url = "",
}) {
  const daysLabel = days_until === "1" ? "1 day" : `${days_until} days`;

  return (
    <BaseLayout previewText={`Your event "${event_title}" is ${daysLabel} away!`}>
      <Section>
        <Heading style={headingStyle}>Event Reminder ⏰</Heading>
        <Text style={introStyle}>
          Hi {host_name}, your event <strong>{event_title}</strong> is just{" "}
          <strong>{daysLabel}</strong> away!
        </Text>
        <Section style={cardStyle}>
          <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
            Make sure everything is ready — check your registry, review gifts,
            and share the link with your guests if you haven&apos;t already.
          </Text>
        </Section>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Event Details
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
