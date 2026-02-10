import React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
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

const logoSectionStyle = {
  textAlign: "center",
  marginBottom: "24px",
};

const footerStyle = {
  fontSize: "12px",
  color: "#9CA3AF",
  textAlign: "center",
  margin: "0",
  lineHeight: "18px",
};

const hrStyle = {
  borderColor: "#E5E7EB",
  margin: "24px 0",
};

export const buttonStyle = {
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};

export const cardStyle = {
  backgroundColor: "#F3F4F6",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
};

export const introStyle = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
};

export const headingStyle = {
  margin: "0 0 12px",
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
};

export default function BaseLayout({ previewText, children }) {
  return (
    <Html>
      <Head />
      <Preview>{previewText || "Giftologi Notification"}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={logoSectionStyle}>
            <Text
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#2563EB",
                margin: "0",
                letterSpacing: "-0.02em",
              }}
            >
              Giftologi
            </Text>
          </Section>

          {children}

          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            © {new Date().getFullYear()} Giftologi. All rights reserved.
          </Text>
          <Text style={footerStyle}>
            If you have questions, reply to this email or contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
