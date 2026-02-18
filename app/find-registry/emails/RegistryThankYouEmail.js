import React from "react";
import {
  Body,
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
const messageCardStyle = {
  backgroundColor: "#F3F4F6",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
};

export default function RegistryThankYouEmail({ hostName, recipientName, registryTitle, message }) {
  const previewText = "A thank-you note from Giftologi.";
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const hostLine = hostName
    ? `${hostName} sent a thank-you note for a registry gift.`
    : "A registry host sent you a thank-you note.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Heading style={{ margin: "0 0 12px", fontSize: "20px" }}>
              Thank you!
            </Heading>
            <Text style={introStyle}>{greeting}</Text>
            <Text style={introStyle}>{hostLine}</Text>
            {registryTitle ? (
              <Text style={introStyle}>Registry: {registryTitle}</Text>
            ) : null}
          </Section>
          {message ? (
            <Section style={messageCardStyle}>
              <Text style={{ margin: 0, fontSize: "14px", lineHeight: "20px" }}>
                {message}
              </Text>
            </Section>
          ) : null}
          <Text style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
            If you have any questions, reply to this email and we will be happy to help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
