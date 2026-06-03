/** Pass-through URLs; use backend USE_LOCAL_UPLOAD or add AWS presign when SDK is installed. */
export async function toAccessibleImageUrl(url: string): Promise<string> {
  return url;
}

export async function presignImageUrls(urls: string[]): Promise<string[]> {
  return urls;
}
