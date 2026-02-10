import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function VendorApplicationStatusEmail({
  vendor_name = "there",
  status = "updated",
  reason = "",
  dashboard_url = "",
}) {
  const isApproved = status === "approved";

  return (
    <BaseLayout
      previewText={`Your vendor application has been ${status}`}
    >
      <Section>
        <Heading style={headingStyle}>
          {isApproved
            ? "Application Approved! 🎉"
            : "Application Update"}
        </Heading>
        <Text style={introStyle}>
          Hi {vendor_name},{" "}
          {isApproved
            ? "congratulations! Your vendor application has been approved. You can now start setting up your store."
            : `your vendor application has been ${status}.`}
        </Text>
        {reason ? (
          <Section style={cardStyle}>
            <Text style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
              <strong>Reason:</strong> {reason}
            </Text>
          </Section>
        ) : null}
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            {isApproved ? "Go to Your Dashboard" : "View Details"}
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
