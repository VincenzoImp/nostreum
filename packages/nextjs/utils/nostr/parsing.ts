const IMAGE_REGEX = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?/gi;
const URL_REGEX = /https?:\/\/[^\s<]+/gi;

export function extractImageUrls(content: string): string[] {
  return content.match(IMAGE_REGEX) || [];
}

export function extractUrls(content: string): string[] {
  return content.match(URL_REGEX) || [];
}

export function getReplyToId(tags: string[][]): string | undefined {
  // NIP-10: look for "reply" marker first, then fall back to last "e" tag
  for (const tag of tags) {
    if (tag[0] === "e" && tag[3] === "reply") return tag[1];
  }
  const eTags = tags.filter(t => t[0] === "e");
  if (eTags.length > 0) return eTags[eTags.length - 1][1];
  return undefined;
}

export function getRootId(tags: string[][]): string | undefined {
  for (const tag of tags) {
    if (tag[0] === "e" && tag[3] === "root") return tag[1];
  }
  const eTags = tags.filter(t => t[0] === "e");
  if (eTags.length > 0) return eTags[0][1];
  return undefined;
}

export function getMentionedPubkeys(tags: string[][]): string[] {
  return tags.filter(t => t[0] === "p").map(t => t[1]);
}
