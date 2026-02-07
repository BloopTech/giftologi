import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/utils/supabase/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registryId = searchParams.get("registry_id");

    if (!registryId) {
      return NextResponse.json(
        { message: "registry_id is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: registry, error: registryError } = await adminClient
      .from("registries")
      .select(
        `
        id,
        title,
        event:events(
          id,
          host_id
        )
      `
      )
      .eq("id", registryId)
      .maybeSingle();

    if (registryError || !registry) {
      return NextResponse.json(
        { message: "Registry not found" },
        { status: 404 }
      );
    }

    const eventData = Array.isArray(registry.event)
      ? registry.event[0]
      : registry.event;

    let hostName = "";
    if (eventData?.host_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("firstname, lastname")
        .eq("id", eventData.host_id)
        .maybeSingle();
      if (profile) {
        hostName =
          `${profile.firstname || ""} ${profile.lastname || ""}`.trim();
      }
    }

    const { data: deliveryAddress } = await adminClient
      .from("delivery_addresses")
      .select("*")
      .eq("registry_id", registryId)
      .maybeSingle();

    if (!deliveryAddress) {
      return NextResponse.json(
        {
          registryId: registry.id,
          registryTitle: registry.title,
          hostName,
          shippingAddress: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        registryId: registry.id,
        registryTitle: registry.title,
        hostName,
        shippingAddress: {
          name: hostName || null,
          streetAddress: deliveryAddress.street_address || "",
          streetAddress2: deliveryAddress.street_address_2 || "",
          city: deliveryAddress.city || "",
          stateProvince: deliveryAddress.state_province || "",
          postalCode: deliveryAddress.postal_code || "",
          digitalAddress: deliveryAddress.digital_address || "",
          countryCode: "GH",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load registry shipping:", error);
    return NextResponse.json(
      { message: "Failed to load registry shipping data" },
      { status: 500 }
    );
  }
}
