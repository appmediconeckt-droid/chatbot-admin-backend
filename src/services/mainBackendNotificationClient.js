const parseResponseBody = async (response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const sendPromotionNotificationToMainBackend = async (payload) => {
  const mainBackendUrl = process.env.MAIN_BACKEND_URL;
  const internalApiToken = process.env.MAIN_BACKEND_INTERNAL_API_TOKEN;

  if (!mainBackendUrl) {
    return {
      success: false,
      status: null,
      error: "MAIN_BACKEND_URL is not configured",
    };
  }

  if (!internalApiToken) {
    return {
      success: false,
      status: null,
      error: "MAIN_BACKEND_INTERNAL_API_TOKEN is not configured",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${mainBackendUrl}/api/notification/promotion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Admin Backend -> Main Backend server-to-server authentication.
        Authorization: `Bearer ${internalApiToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await parseResponseBody(response);

    return {
      success: response.ok,
      status: response.status,
      body,
      error: response.ok ? null : body?.error || body?.message || "Request failed",
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
};
