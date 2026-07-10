import type { RefObject } from "react";
import type { View } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { captureRef as captureViewRef } from "react-native-view-shot";
import { OVERLAY_REFERENCE_WIDTH, type PhotoOverlay } from "./overlay";

type ExportParams = {
  uri: string;
  overlay: PhotoOverlay | null;
  captureRef?: RefObject<View | null>;
};

type ExportResult = { success: boolean; message: string };

export async function exportOverlaidPhoto({ captureRef: viewRef }: ExportParams): Promise<ExportResult> {
  if (!viewRef?.current) {
    return { success: false, message: "Couldn't capture the photo. Try again." };
  }

  try {
    const capturedUri = await captureViewRef(viewRef, {
      format: "jpg",
      quality: 0.92,
      result: "tmpfile",
      width: OVERLAY_REFERENCE_WIDTH,
      height: OVERLAY_REFERENCE_WIDTH,
    });

    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.granted) {
      await MediaLibrary.saveToLibraryAsync(capturedUri);
      return { success: true, message: "Saved to Photos" };
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(capturedUri);
      return { success: true, message: "Shared" };
    }

    return { success: false, message: "Couldn't save — no permission granted." };
  } catch {
    return { success: false, message: "Couldn't save the photo. Try again." };
  }
}
