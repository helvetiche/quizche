export const uploadImageToImgbb = async (
  file: File,
  idToken: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const { apiPost } = await import("../app/lib/api");

  const response = await apiPost("/api/upload/image", {
    body: formData,
    idToken,
    headers: {},
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const errorMessage = errorData.error;
    throw new Error(
      typeof errorMessage === "string" ? errorMessage : "Failed to upload image"
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (typeof data.url !== "string") {
    throw new Error("Failed to upload image: Invalid response from server");
  }

  return data.url;
};
