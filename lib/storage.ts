import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sanitiza una cadena para ser usada de manera segura como nombre de carpeta en Storage.
 */
export function sanitizeFolderName(name: string, fallback = "item"): string {
  const sanitized = (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || fallback;
}

/**
 * Extrae la ruta relativa de un archivo en Supabase Storage a partir de su URL pública.
 */
export function getStoragePathFromUrl(url: string, bucketName: string): string | null {
  try {
    if (!url) return null;
    const bucketIdentifier = `/${bucketName}/`;
    const index = url.indexOf(bucketIdentifier);
    if (index !== -1) {
      const pathPart = url.substring(index + bucketIdentifier.length);
      return decodeURIComponent(pathPart.split("?")[0]);
    }
    if (!url.startsWith("http")) return url;
    return null;
  } catch {
    return null;
  }
}

/**
 * Sube una lista de archivos a un bucket de Supabase dentro de una carpeta específica.
 */
export async function uploadFilesToBucket(
  supabase: SupabaseClient,
  bucketName: string,
  files: File[],
  folderName: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  const safeFolder = sanitizeFolderName(folderName);

  for (const file of files) {
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${safeFolder}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error(`Error al subir ${file.name}:`, uploadError);
      throw new Error(`Error al subir imagen ${file.name}: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    if (data?.publicUrl) {
      uploadedUrls.push(data.publicUrl);
    }
  }

  return uploadedUrls;
}

/**
 * Elimina una lista de archivos del bucket de Supabase a partir de sus URLs públicas.
 */
export async function deleteFilesFromBucket(
  supabase: SupabaseClient,
  bucketName: string,
  photoUrls: string[]
): Promise<void> {
  if (!photoUrls || photoUrls.length === 0) return;

  const pathsToDelete = photoUrls
    .map((url) => getStoragePathFromUrl(url, bucketName))
    .filter((path): path is string => Boolean(path));

  if (pathsToDelete.length > 0) {
    const { error } = await supabase.storage.from(bucketName).remove(pathsToDelete);
    if (error) {
      console.warn("Advertencia al eliminar fotos de storage:", error.message);
    }
  }
}
