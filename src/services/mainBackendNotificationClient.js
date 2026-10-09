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
  const mainBackendUrl = String(process.env.MAIN_BACKEND_URL || "").trim().replace(/\/+$/, "");
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
    const code = error.cause?.code || error.code;
    const timedOut = controller.signal.aborted;
    return {
      success: false,
      status: timedOut ? 504 : null,
      error: timedOut
        ? "Main Backend notification request timed out. Some notifications may already have been sent; check delivery before retrying."
        : code === "ECONNREFUSED"
          ? "Main Backend is not running or its port is incorrect. Start the Main Backend and check MAIN_BACKEND_URL."
          : code === "ENOTFOUND" || code === "EAI_AGAIN"
            ? "Main Backend hostname could not be resolved. Check MAIN_BACKEND_URL."
            : "Unable to reach Main Backend. Check MAIN_BACKEND_URL, network access, and Main Backend logs.",
      code: timedOut ? "MAIN_BACKEND_TIMEOUT" : code || "MAIN_BACKEND_UNREACHABLE",
    };
  } finally {
    clearTimeout(timeout);
  }
};
