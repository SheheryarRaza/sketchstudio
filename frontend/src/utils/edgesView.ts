/**
 * Reference Image synchronization helper for edges view (Issue #14).
 *
 * Prevents race conditions where project.imageSrc changes immediately on user selection,
 * but the decoded HTMLImageElement (loadedImage) updates asynchronously on decode.
 */

/**
 * Returns true if the decoded Reference Image element actually reflects the
 * currently selected Reference Image src string.
 *
 * When an artist switches the Reference Image, project.imageSrc updates immediately,
 * while loadedImage retains the previous Image element until img.onload completes.
 * Analysis and contour extraction must only proceed once loadedImage is synchronized.
 */
export function isLoadedImageSynchronized(
  loadedImage: { src: string } | null | undefined,
  currentImageSrc: string | null | undefined
): boolean {
  if (!loadedImage || !currentImageSrc) return false;
  return loadedImage.src === currentImageSrc;
}
