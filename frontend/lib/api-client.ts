const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

interface ApiRequestOptions
  extends RequestInit {
  skipJson?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    skipJson,
    ...fetchOptions
  } = options;

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...fetchOptions,

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    }
  );

  if (skipJson) {
    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}`
      );
    }

    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Something went wrong"
    );
  }

  return data;
}