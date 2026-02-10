import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function AdminNewVendorApplicationEmail({
  vendor_name = "A new vendor",
  application_id = "",
  dashboard_url = "",
}) {
  return (
    <BaseLayout previewText={`New vendor application: ${vendor_name}`}>
      <Section>
        <Heading style={headingStyle}>New Vendor Application</Heading>
        <Text style={introStyle}>
          <strong>{vendor_name}</strong> has submitted a vendor application and
          is awaiting review.
        </Text>
        {application_id ? (
          <Section style={cardStyle}>
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Application ID:</strong> {application_id}
            </Text>
          </Section>
        ) : null}
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            Review Application
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
