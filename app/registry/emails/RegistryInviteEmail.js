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
const messageCardStyle = {
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

export default function RegistryInviteEmail({
  hostName,
  registryTitle,
  registryUrl,
  message,
}) {
  const previewText = "You are invited to a Giftologi registry.";
  const greeting = hostName
    ? `${hostName} invited you to a gift registry.`
    : "You are invited to a gift registry.";
  const registryLabel = registryTitle ? `Registry: ${registryTitle}` : "View the registry";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Heading style={{ margin: "0 0 12px", fontSize: "20px" }}>
              You are invited to a Giftologi registry
            </Heading>
            <Text style={introStyle}>{greeting}</Text>
            <Text style={introStyle}>
              {registryTitle
                ? `Help celebrate by browsing the registry for ${registryTitle}.`
                : "Help celebrate by browsing the registry."}
            </Text>
          </Section>
          {message ? (
            <Section style={messageCardStyle}>
              <Text style={{ margin: 0, fontSize: "14px", lineHeight: "20px" }}>
                {message}
              </Text>
            </Section>
          ) : null}
          {registryUrl ? (
            <Section style={{ marginBottom: "20px" }}>
              <Button href={registryUrl} style={buttonStyle}>
                {registryLabel}
              </Button>
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
