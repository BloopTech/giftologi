import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import BaseLayout, {
  buttonStyle,
  cardStyle,
  headingStyle,
  introStyle,
} from "./components/BaseLayout";

export default function VendorProductReviewEmail({
  vendor_name = "Vendor",
  product_name = "your product",
  reviewer_name = "A customer",
  rating = "",
  dashboard_url = "",
}) {
  const stars = rating ? "★".repeat(Math.min(Number(rating) || 0, 5)) : "";

  return (
    <BaseLayout previewText={`New review for ${product_name}`}>
      <Section>
        <Heading style={headingStyle}>New Product Review ⭐</Heading>
        <Text style={introStyle}>
          Hi {vendor_name}, {reviewer_name} left a review for{" "}
          <strong>{product_name}</strong>.
        </Text>
        {stars ? (
          <Section style={cardStyle}>
            <Text
              style={{
                margin: 0,
                fontSize: "20px",
                color: "#F59E0B",
                letterSpacing: "2px",
              }}
            >
              {stars}
            </Text>
          </Section>
        ) : null}
        <Text style={introStyle}>
          Check your dashboard to see the full review and respond.
        </Text>
      </Section>
      {dashboard_url ? (
        <Section style={{ marginBottom: "20px" }}>
          <Button href={dashboard_url} style={buttonStyle}>
            View Reviews
          </Button>
        </Section>
      ) : null}
    </BaseLayout>
  );
}
