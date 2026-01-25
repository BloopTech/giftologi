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
const labelStyle = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6B7280",
  margin: "0 0 6px",
};
const codeStyle = {
  fontFamily: "Menlo, Monaco, 'Courier New', monospace",
  fontSize: "14px",
  margin: 0,
  color: "#111827",
};
const cardStyle = {
  backgroundColor: "#F3F4F6",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
};
const buttonStyle = {
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
};

export default function VendorApplicationSubmittedEmail({
  vendorName,
  applicationId,
  trackUrl,
}) {
  const previewText = "We received your vendor application.";
  const greeting = vendorName
    ? `Hi ${vendorName}, thanks for applying to Giftologi.`
    : "Thanks for applying to Giftologi.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Heading style={{ margin: "0 0 12px", fontSize: "20px" }}>
              Your vendor application was submitted
            </Heading>
            <Text style={introStyle}>{greeting}</Text>
            <Text style={introStyle}>
              We&apos;re reviewing your details now. We&apos;ll email you as soon as we
              have an update.
            </Text>
          </Section>
          <Section style={cardStyle}>
            <Text style={labelStyle}>Application ID</Text>
            <Text style={codeStyle}>{applicationId}</Text>
          </Section>
          {trackUrl ? (
            <Section style={{ marginBottom: "20px" }}>
              <Button href={trackUrl} style={buttonStyle}>
                View your vendor profile
              </Button>
              <Text style={{ fontSize: "12px", color: "#6B7280" }}>
                You can update your profile details and check your application
                status anytime.
              </Text>
            </Section>
          ) : null}
          <Text style={{ fontSize: "14px", margin: 0 }}>
            If you have any questions, reply to this email and we&apos;ll be happy to
            help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
