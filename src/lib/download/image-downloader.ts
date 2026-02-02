import type { Options, ConversionResult } from '@/shared/types';
import { getExtensionFromMimeType } from './mime-types';

export async function preDownloadImages(
  imageList: Record<string, string>,
  markdown: string,
  options: Options
): Promise<ConversionResult> {
  const newImageList: Record<string, string> = {};
  let processedMarkdown = markdown;

  await Promise.all(
    Object.entries(imageList).map(
      ([src, filename]) =>
        new Promise<void>((resolve) => {
          fetch(src)
            .then((response) => response.blob())
            .then(async (blob) => {
              if (options.imageStyle === 'base64') {
                const reader = new FileReader();
                reader.onloadend = () => {
                  processedMarkdown = processedMarkdown.replaceAll(src, reader.result as string);
                  resolve();
                };
                reader.readAsDataURL(blob);
              } else {
                let newFilename = filename;

                if (newFilename.endsWith('.idunno')) {
                  const extension = getExtensionFromMimeType(blob.type);
                  newFilename = filename.replace('.idunno', '.' + extension);

                  if (!options.imageStyle.startsWith('obsidian')) {
                    processedMarkdown = processedMarkdown.replaceAll(
                      filename
                        .split('/')
                        .map((s) => encodeURI(s))
                        .join('/'),
                      newFilename
                        .split('/')
                        .map((s) => encodeURI(s))
                        .join('/')
                    );
                  } else {
                    processedMarkdown = processedMarkdown.replaceAll(filename, newFilename);
                  }
                }

                const blobUrl = URL.createObjectURL(blob);
                newImageList[blobUrl] = newFilename;
                resolve();
              }
            })
            .catch((err) => {
              console.error(`Failed to download ${src}:`, err);
              resolve();
            });
        })
    )
  );

  return { imageList: newImageList, markdown: processedMarkdown };
}
