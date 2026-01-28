import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const bodyStyle = {
  margin: 0,
  backgroundColor: "#F9FAFB",
  fontFamily: "Arial, sans-serif",
  color: "#111827",
};

const containerStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  padding: "32px",
  margin: "32px auto",
  width: "100%",
  maxWidth: "520px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const introStyle = { margin: "0 0 16px", fontSize: "14px", lineHeight: "20px" };
const buttonStyle = {
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
};

export default function CloseRequestApprovedEmail({ vendorName, dashboardUrl }) {
  const storeName = vendorName || "your shop";
  const link = dashboardUrl || "";

  const previewText = "Your shop closure request was approved.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Heading style={{ margin: "0 0 12px", fontSize: "20px" }}>
              Shop closure approved
            </Heading>
            <Text style={introStyle}>
              Your request to close <strong>{storeName}</strong> has been approved.
            </Text>
            <Text style={introStyle}>
              Your shop is now closed and your products have been deactivated.
            </Text>
          </Section>

          {link ? (
            <Section style={{ marginBottom: "20px" }}>
              <Button href={link} style={buttonStyle}>
                View your vendor dashboard
              </Button>
              <Text style={{ fontSize: "12px", color: "#6B7280" }}>
                You can review your shop status and export your data anytime.
              </Text>
            </Section>
          ) : null}

          <Text style={{ fontSize: "12px", margin: 0, color: "#6B7280" }}>
            If you believe this was a mistake, please contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
