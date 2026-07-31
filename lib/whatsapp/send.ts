type SendResult =
  | { ok: true; mode: "api" | "template" }
  | { ok: false; error: string; needsTemplate?: boolean };

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en_US";
  return { token, phoneNumberId, apiVersion, templateName, templateLang };
}

export function isWhatsAppApiConfigured() {
  const { token, phoneNumberId } = getWhatsAppConfig();
  return Boolean(token && phoneNumberId);
}

export function buildWhatsAppMeUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppFixturesLink(
  phone: string,
  link: string,
): Promise<SendResult> {
  const { token, phoneNumberId, apiVersion, templateName, templateLang } =
    getWhatsAppConfig();

  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp Cloud API is not configured" };
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const bodyText =
    `Bet2Star Sports Betting fixtures\n\nView & download PDF:\n${link}`;

  // Prefer approved template for cold outreach when configured
  if (templateName) {
    const templateRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: link }],
            },
          ],
        },
      }),
    });

    if (templateRes.ok) {
      return { ok: true, mode: "template" };
    }

    const templateErr = await templateRes.text();
    console.error("WhatsApp template send failed:", templateErr);
  }

  // Send as downloadable PDF document (direct media URL)
  const docRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "document",
      document: {
        link,
        filename: "bet2star-sports-fixtures.pdf",
        caption: "Bet2Star Sports Betting fixtures — tap to view & download",
      },
    }),
  });

  if (docRes.ok) {
    return { ok: true, mode: "api" };
  }

  const docErr = await docRes.text();
  console.error("WhatsApp document send failed:", docErr);

  const textRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { preview_url: true, body: bodyText },
    }),
  });

  if (textRes.ok) {
    return { ok: true, mode: "api" };
  }

  const errText = await textRes.text();
  console.error("WhatsApp text send failed:", errText);

  let message = "Failed to send WhatsApp message";
  try {
    const parsed = JSON.parse(errText);
    message = parsed?.error?.message || message;
  } catch {
    // keep default
  }

  return {
    ok: false,
    error: message,
    needsTemplate: !templateName,
  };
}
