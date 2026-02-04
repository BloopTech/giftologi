const DEFAULT_VERSION = "v1.0";
const DEFAULT_CURRENCY = "GHS";
const DEFAULT_WEIGHT_UNIT = "KG";
const DEFAULT_REPORT_ID = "9729";
const DEFAULT_REPORT_TYPE = "URL";
const DEFAULT_RATE_SOAP_ACTION =
  "http://ws.dev.aramex.net/ShippingAPI/v1/Service_1_0/CalculateRate";
const DEFAULT_LOCATION_URL =
  "https://ws.aramex.net/ShippingAPI.V2/Location/Service_1_0.svc";
const DEFAULT_STATES_SOAP_ACTION =
  "http://ws.aramex.net/ShippingAPI/v1/Service_1_0/FetchStates";

const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const getXmlValue = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
};

const getXmlValues = (xml, tag) => {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi");
  const values = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    values.push(match[1].trim());
  }
  return values;
};

const normalizeMessage = (value) => String(value ?? "").trim();

const getNotificationMessages = (xml) => {
  const notifications = getXmlValues(xml, "Notification");
  return notifications
    .map((notification) => getXmlValue(notification, "Message") || notification)
    .map((message) => normalizeMessage(message))
    .filter(Boolean);
};

const extractStatesFromXml = (xml) => {
  const statesContainer = getXmlValue(xml, "States");
  const source = statesContainer || xml;
  const stateBlocks = getXmlValues(source, "State");
  return stateBlocks
    .map((stateBlock) => ({
      code: getXmlValue(stateBlock, "Code"),
      name: getXmlValue(stateBlock, "Name"),
    }))
    .filter((state) => state.name);
};

const buildPartyXml = (party) => {
  const address = party?.address || "";
  const address2 = party?.address2 || "";
  return `
    <PartyAddress>
      <Line1>${escapeXml(address)}</Line1>
      <Line2>${escapeXml(address2)}</Line2>
      <City>${escapeXml(party?.city)}</City>
      <StateOrProvinceCode>${escapeXml(party?.state)}</StateOrProvinceCode>
      <PostCode>${escapeXml(party?.postalCode)}</PostCode>
      <CountryCode>${escapeXml(party?.countryCode)}</CountryCode>
    </PartyAddress>
    <Contact>
      <PersonName>${escapeXml(party?.name)}</PersonName>
      <CompanyName>${escapeXml(party?.company)}</CompanyName>
      <PhoneNumber1>${escapeXml(party?.phone)}</PhoneNumber1>
      <CellPhone>${escapeXml(party?.phone)}</CellPhone>
      <EmailAddress>${escapeXml(party?.email)}</EmailAddress>
    </Contact>
  `;
};

const buildAddressXml = (address) => `
  <Line1>${escapeXml(address?.line1 || address?.address || "")}</Line1>
  <Line2>${escapeXml(address?.line2 || "")}</Line2>
  <Line3>${escapeXml(address?.line3 || "")}</Line3>
  <City>${escapeXml(address?.city)}</City>
  <StateOrProvinceCode>${escapeXml(address?.state)}</StateOrProvinceCode>
  <PostCode>${escapeXml(address?.postalCode)}</PostCode>
  <CountryCode>${escapeXml(address?.countryCode)}</CountryCode>
`;

const getClientInfoXml = () => {
  const username = getRequiredEnv("ARAMEX_USERNAME");
  const password = getRequiredEnv("ARAMEX_PASSWORD");
  const accountNumber = getRequiredEnv("ARAMEX_ACCOUNT_NUMBER");
  const accountPin = getRequiredEnv("ARAMEX_ACCOUNT_PIN");
  const accountEntity = getRequiredEnv("ARAMEX_ACCOUNT_ENTITY");
  const accountCountry = getRequiredEnv("ARAMEX_ACCOUNT_COUNTRY_CODE");
  const version = process.env.ARAMEX_VERSION || DEFAULT_VERSION;

  return `
    <ClientInfo>
      <UserName>${escapeXml(username)}</UserName>
      <Password>${escapeXml(password)}</Password>
      <Version>${escapeXml(version)}</Version>
      <AccountNumber>${escapeXml(accountNumber)}</AccountNumber>
      <AccountPin>${escapeXml(accountPin)}</AccountPin>
      <AccountEntity>${escapeXml(accountEntity)}</AccountEntity>
      <AccountCountryCode>${escapeXml(accountCountry)}</AccountCountryCode>
    </ClientInfo>
  `;
};

const buildSoapEnvelope = (body) => `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      ${body}
    </soap:Body>
  </soap:Envelope>`;

const requestAramex = async ({ url, action, body }) => {
  const headers = {
    "Content-Type": "text/xml; charset=utf-8",
  };
  if (action) {
    headers.SOAPAction = action;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error("Aramex request failed");
    error.raw = text;
    throw error;
  }
  return text;
};

export const buildAramexTrackingUrl = (trackingNumber) =>
  trackingNumber
    ? `https://www.aramex.com/track/shipments?ShipmentNumber=${encodeURIComponent(
        trackingNumber
      )}`
    : "";

export const createAramexShipment = async ({ shipper, consignee, shipment, reference }) => {
  const shippingUrl = getRequiredEnv("ARAMEX_SHIPPING_URL");
  const soapAction = process.env.ARAMEX_CREATE_SOAP_ACTION;
  const labelReportId = process.env.ARAMEX_LABEL_REPORT_ID || DEFAULT_REPORT_ID;
  const labelReportType = process.env.ARAMEX_LABEL_REPORT_TYPE || DEFAULT_REPORT_TYPE;
  const productGroup = shipment?.productGroup || process.env.ARAMEX_PRODUCT_GROUP || "EXP";
  const productType = shipment?.productType || process.env.ARAMEX_PRODUCT_TYPE || "PPX";
  const paymentType = shipment?.paymentType || process.env.ARAMEX_PAYMENT_TYPE || "P";
  const currency = shipment?.currency || process.env.ARAMEX_CURRENCY || DEFAULT_CURRENCY;
  const weightUnit = shipment?.weightUnit || DEFAULT_WEIGHT_UNIT;

  const detailsXml = `
    <Details>
      <Dimensions>
        <Length>${escapeXml(shipment?.dimensions?.length || 0)}</Length>
        <Width>${escapeXml(shipment?.dimensions?.width || 0)}</Width>
        <Height>${escapeXml(shipment?.dimensions?.height || 0)}</Height>
        <Unit>${escapeXml(shipment?.dimensions?.unit || "CM")}</Unit>
      </Dimensions>
      <ActualWeight>
        <Unit>${escapeXml(weightUnit)}</Unit>
        <Value>${escapeXml(shipment?.weight || 1)}</Value>
      </ActualWeight>
      <NumberOfPieces>${escapeXml(shipment?.numberOfPieces || 1)}</NumberOfPieces>
      <ProductGroup>${escapeXml(productGroup)}</ProductGroup>
      <ProductType>${escapeXml(productType)}</ProductType>
      <PaymentType>${escapeXml(paymentType)}</PaymentType>
      <DescriptionOfGoods>${escapeXml(shipment?.description || "Gift items")}</DescriptionOfGoods>
      <GoodsOriginCountry>${escapeXml(
        shipment?.originCountryCode || shipper?.countryCode || "GH"
      )}</GoodsOriginCountry>
      <CustomsValueAmount>
        <Value>${escapeXml(shipment?.goodsValue || shipment?.declaredValue || 0)}</Value>
        <CurrencyCode>${escapeXml(currency)}</CurrencyCode>
      </CustomsValueAmount>
    </Details>
  `;

  const body = `
    <CreateShipments xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      ${getClientInfoXml()}
      <Shipments>
        <Shipment>
          <Shipper>
            ${buildPartyXml(shipper)}
          </Shipper>
          <Consignee>
            ${buildPartyXml(consignee)}
          </Consignee>
          <Reference1>${escapeXml(reference || "")}</Reference1>
          ${detailsXml}
        </Shipment>
      </Shipments>
      <LabelInfo>
        <ReportID>${escapeXml(labelReportId)}</ReportID>
        <ReportType>${escapeXml(labelReportType)}</ReportType>
      </LabelInfo>
    </CreateShipments>
  `;

  const xml = await requestAramex({
    url: shippingUrl,
    action: soapAction,
    body: buildSoapEnvelope(body),
  });

  const hasErrors = /<HasErrors>true<\/HasErrors>/i.test(xml);
  const notifications = getXmlValues(xml, "Notification");
  const message = getXmlValue(xml, "Message");
  const shipmentNumber =
    getXmlValue(xml, "ShipmentNumber") || getXmlValue(xml, "ID") || "";
  const labelUrl = getXmlValue(xml, "LabelURL") || getXmlValue(xml, "ShipmentLabelURL") || "";

  return {
    raw: xml,
    hasErrors,
    message: message || notifications.join(" ").trim(),
    shipmentNumber,
    labelUrl,
  };
};

export const trackAramexShipment = async ({ trackingNumber }) => {
  const trackingUrl = getRequiredEnv("ARAMEX_TRACKING_URL");
  const soapAction = process.env.ARAMEX_TRACK_SOAP_ACTION;

  const body = `
    <TrackShipments xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      ${getClientInfoXml()}
      <Shipments>
        <string>${escapeXml(trackingNumber)}</string>
      </Shipments>
      <GetLastTrackingUpdateOnly>true</GetLastTrackingUpdateOnly>
    </TrackShipments>
  `;

  const xml = await requestAramex({
    url: trackingUrl,
    action: soapAction,
    body: buildSoapEnvelope(body),
  });

  const hasErrors = /<HasErrors>true<\/HasErrors>/i.test(xml);
  const description = getXmlValue(xml, "UpdateDescription");
  const updateDate = getXmlValue(xml, "UpdateDateTime") || getXmlValue(xml, "UpdateDate");

  return {
    raw: xml,
    hasErrors,
    description,
    updateDate,
  };
};

export const fetchAramexStates = async ({ countryCode }) => {
  const locationUrl = process.env.ARAMEX_LOCATION_URL || DEFAULT_LOCATION_URL;
  const soapAction =
    process.env.ARAMEX_STATES_SOAP_ACTION || DEFAULT_STATES_SOAP_ACTION;
  const safeCountryCode = countryCode || "";

  const body = `
    <StatesFetchingRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      ${getClientInfoXml()}
      <Transaction>
        <Reference1>${escapeXml(safeCountryCode)}</Reference1>
      </Transaction>
      <CountryCode>${escapeXml(safeCountryCode)}</CountryCode>
    </StatesFetchingRequest>
  `;

  const xml = await requestAramex({
    url: locationUrl,
    action: soapAction,
    body: buildSoapEnvelope(body),
  });

  const hasErrors = /<HasErrors>true<\/HasErrors>/i.test(xml);
  const message = getXmlValue(xml, "Message");
  const notifications = getNotificationMessages(xml);
  const states = extractStatesFromXml(xml);

  return {
    raw: xml,
    hasErrors,
    message: message || notifications.join(" ").trim(),
    states,
  };
};

export const calculateAramexRate = async ({
  origin,
  destination,
  shipment,
  reference,
}) => {
  const rateUrl =
    process.env.ARAMEX_RATE_URL || getRequiredEnv("ARAMEX_SHIPPING_URL");
  const soapAction =
    process.env.ARAMEX_RATE_SOAP_ACTION || DEFAULT_RATE_SOAP_ACTION;
  const productGroup = shipment?.productGroup || process.env.ARAMEX_PRODUCT_GROUP || "EXP";
  const productType = shipment?.productType || process.env.ARAMEX_PRODUCT_TYPE || "PPX";
  const paymentType = shipment?.paymentType || process.env.ARAMEX_PAYMENT_TYPE || "P";
  const currency = shipment?.currency || process.env.ARAMEX_CURRENCY || DEFAULT_CURRENCY;
  const weightUnit = shipment?.weightUnit || DEFAULT_WEIGHT_UNIT;
  const weightValue = Number.isFinite(Number(shipment?.weight))
    ? Number(shipment.weight)
    : 1;

  const detailsXml = `
    <ShipmentDetails>
      <Dimensions>
        <Length>${escapeXml(shipment?.dimensions?.length || 0)}</Length>
        <Width>${escapeXml(shipment?.dimensions?.width || 0)}</Width>
        <Height>${escapeXml(shipment?.dimensions?.height || 0)}</Height>
        <Unit>${escapeXml(shipment?.dimensions?.unit || "CM")}</Unit>
      </Dimensions>
      <ActualWeight>
        <Unit>${escapeXml(weightUnit)}</Unit>
        <Value>${escapeXml(weightValue)}</Value>
      </ActualWeight>
      <ChargeableWeight>
        <Unit>${escapeXml(weightUnit)}</Unit>
        <Value>${escapeXml(weightValue)}</Value>
      </ChargeableWeight>
      <DescriptionOfGoods>${escapeXml(shipment?.description || "Gift items")}</DescriptionOfGoods>
      <GoodsOriginCountry>${escapeXml(
        shipment?.originCountryCode || origin?.countryCode || "GH"
      )}</GoodsOriginCountry>
      <NumberOfPieces>${escapeXml(shipment?.numberOfPieces || 1)}</NumberOfPieces>
      <ProductGroup>${escapeXml(productGroup)}</ProductGroup>
      <ProductType>${escapeXml(productType)}</ProductType>
      <PaymentType>${escapeXml(paymentType)}</PaymentType>
      <CustomsValueAmount>
        <Value>${escapeXml(shipment?.goodsValue || shipment?.declaredValue || 0)}</Value>
        <CurrencyCode>${escapeXml(currency)}</CurrencyCode>
      </CustomsValueAmount>
    </ShipmentDetails>
  `;

  const body = `
    <RateCalculatorRequest xmlns="http://ws.aramex.net/ShippingAPI/v1/">
      ${getClientInfoXml()}
      <Transaction>
        <Reference1>${escapeXml(reference || "")}</Reference1>
      </Transaction>
      <OriginAddress>
        ${buildAddressXml(origin)}
      </OriginAddress>
      <DestinationAddress>
        ${buildAddressXml(destination)}
      </DestinationAddress>
      ${detailsXml}
    </RateCalculatorRequest>
  `;

  const xml = await requestAramex({
    url: rateUrl,
    action: soapAction,
    body: buildSoapEnvelope(body),
  });

  const hasErrors = /<HasErrors>true<\/HasErrors>/i.test(xml);
  const notifications = getXmlValues(xml, "Notification");
  const message = getXmlValue(xml, "Message");
  const totalAmountXml = getXmlValue(xml, "TotalAmount");
  const totalValue = totalAmountXml ? getXmlValue(totalAmountXml, "Value") : "";
  const totalCurrency = totalAmountXml
    ? getXmlValue(totalAmountXml, "CurrencyCode")
    : "";

  return {
    raw: xml,
    hasErrors,
    message: message || notifications.join(" ").trim(),
    totalAmount: totalValue ? Number(totalValue) : null,
    currency: totalCurrency || currency,
  };
};
