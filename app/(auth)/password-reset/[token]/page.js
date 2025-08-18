"use server";
import React from "react";
import PasswordResetPageLayout from "./page-layout";
import { notFound } from "next/navigation";
import { jwtVerify } from "jose";

// Function to validate JWT token and extract payload
async function validateAndDecodeToken(token) {
  if (!token) return { isValid: false, payload: null };

  try {
    // You should use the same secret that was used to sign the token
    // For verification purposes only - in production use a proper secret
    const secret = new TextEncoder().encode("JfoZyeGIIVIMUw6jhRwwBQ_Az9NT2lKxbZQF43o5r8Y");

    // Verify the token and get its payload
    const { payload } = await jwtVerify(token, secret);
    return { isValid: true, payload };
  } catch (error) {
    console.error("Token validation error:", error.message);

    // For debugging purposes, we can still try to decode the token without verification
    // This is useful during development and debugging
    try {
      // Manual decode without verification
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        console.log("Decoded payload (not verified):", payload);
      }
    } catch (decodeError) {
      console.error("Token decode error:", decodeError.message);
    }

    return { isValid: false, payload: null };
  }
}

export default async function PasswordReset({ params }) {
  const { token } = await params;

  const { isValid, payload } = await validateAndDecodeToken(token);

  if (!isValid) {
    return notFound();
  }

  const email = payload?.email;

  return (
    <>
      <PasswordResetPageLayout email={email} />
    </>
  );
}
