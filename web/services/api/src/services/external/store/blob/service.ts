import { put, del } from "@vercel/blob";

interface UploadOptions {
  contentType?: string;
}

interface UploadResult {
  url: string;
}

const BlobStorageService = {
  upload: async (
    path: string,
    data: Buffer | Blob | string,
    options: UploadOptions = {},
  ): Promise<UploadResult> => {
    const { url } = await put(path, data, {
      access: "public",
      contentType: options.contentType,
    });

    return { url };
  },

  download: async (url: string): Promise<Buffer> => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download blob: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  delete: async (url: string): Promise<void> => {
    await del(url);
  },
};

export default BlobStorageService;
