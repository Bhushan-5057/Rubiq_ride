/**
 * Single-device FCM policy: always keep exactly one active token.
 * Replaces the full array so old installs / refresh tokens cannot pile up.
 */

export function buildFcmTokenEntry(token, platform = "android") {
  if (!token) return null;
  return {
    token: String(token).trim(),
    platform: platform || "android",
    lastActiveAt: new Date(),
  };
}

export function fcmTokensReplacePayload(token, platform = "android") {
  const entry = buildFcmTokenEntry(token, platform);
  return entry ? [entry] : [];
}

/** Mutate a mongoose document: fcmTokens becomes only this token. */
export function applyFcmTokenToDocument(doc, token, platform = "android") {
  if (!doc || !token) return;
  doc.fcmTokens = fcmTokensReplacePayload(token, platform);
}

/**
 * Atomic replace for Driver / Passenger by id.
 */
export async function replaceUserFcmTokens(Model, userId, token, platform = "android") {
  if (!Model || !userId || !token) return { modified: false };

  const result = await Model.updateOne(
    { _id: userId },
    {
      $set: {
        fcmTokens: fcmTokensReplacePayload(token, platform),
      },
    },
  );

  return {
    modified: (result.modifiedCount || 0) > 0 || (result.matchedCount || 0) > 0,
  };
}
