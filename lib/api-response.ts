export async function parseJsonResponse<T = { success?: boolean; error?: string }>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();
  const title = text.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
  const message = title || text.trim() || response.statusText;

  throw new Error(
    `Expected JSON but received ${contentType || "an empty content type"} (${response.status}): ${message}`
  );
}
