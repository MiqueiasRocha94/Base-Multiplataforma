"use client";

import { useCallback } from "react";

import { useDevice } from "@/contexts/DeviceContext";
import type { FileItem } from "@/types/file-item";

/**
 * Captura/seleção de imagem cross-platform através do portão de recursos do
 * Device (`useDevice().pickImage`): câmera nativa via Capacitor ou explorador de
 * arquivos na web. Retorna `open()` para disparar o fluxo.
 */
export function useImageCapture(onPicked: (file: FileItem) => void) {
  const { pickImage } = useDevice();

  const open = useCallback(async () => {
    const file = await pickImage();
    if (file) {
      onPicked(file);
    }
  }, [pickImage, onPicked]);

  return { open };
}
