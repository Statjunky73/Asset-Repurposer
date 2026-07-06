import * as VideoThumbnails from "expo-video-thumbnails";

export async function extractVideoFrame(uri: string): Promise<string> {
  const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
    time: 1000,
    quality: 0.8,
  });
  return thumbUri;
}
