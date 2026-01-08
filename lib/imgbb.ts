export const uploadImageToImgbb = async (
  file: File,
  idToken: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  // Use dynamic import to avoid SSR issues
  const { apiPost } = await import("../app/lib/api");

  const response = await apiPost("/api/upload/image", {
    body: formData,
    idToken,
    // Don't set Content-Type header for FormData, browser will set it with boundary
    headers: {},
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload image");
  }

  const data = await response.json();

  if (!data.url) {
    throw new Error("Failed to upload image: Invalid response from server");
  }

  return data.url;
};
