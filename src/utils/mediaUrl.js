const s3HostPattern = /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;

const trimSlashes = (value = "") => String(value).replace(/^\/+|\/+$/g, "");

const encodeS3Key = (key) =>
  trimSlashes(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const getCloudFrontBaseUrl = () => {
  const baseUrl = trimSlashes(process.env.CLOUDFRONT_BASE_URL);
  if (!baseUrl) return "";

  return /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const extractS3KeyFromUrl = (value) => {
  if (!isHttpUrl(value)) return null;

  const bucketName = process.env.AWS_BUCKET_NAME;
  if (!bucketName) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const pathParts = trimSlashes(url.pathname).split("/").filter(Boolean);

    if (host === `${bucketName}.s3.amazonaws.com` || host.startsWith(`${bucketName}.s3.`)) {
      return decodeURIComponent(trimSlashes(url.pathname));
    }

    if (s3HostPattern.test(host) && pathParts[0] === bucketName) {
      return pathParts.slice(1).map(decodeURIComponent).join("/");
    }
  } catch {
    return null;
  }

  return null;
};

export const getPublicMediaUrl = (value) => {
  if (!value || typeof value !== "string") return value;

  const cloudFrontBaseUrl = getCloudFrontBaseUrl();
  const s3Key = extractS3KeyFromUrl(value) || (!isHttpUrl(value) ? trimSlashes(value) : null);

  if (cloudFrontBaseUrl && s3Key) {
    return `${cloudFrontBaseUrl}/${encodeS3Key(s3Key)}`;
  }

  return value;
};

export const normalizeDriverMediaUrls = (driver) => {
  if (!driver || typeof driver !== "object") return driver;

  const normalizedDriver = { ...driver };
  normalizedDriver.profileImage = getPublicMediaUrl(normalizedDriver.profileImage);

  if (normalizedDriver.documents && typeof normalizedDriver.documents === "object") {
    normalizedDriver.documents = { ...normalizedDriver.documents };
    [
      "aadhaarFront",
      "aadhaarBack",
      "panFront",
      "licenseFront",
      "licenseBack",
      "rcFront",
      "rcBack",
      "insurance",
    ].forEach((field) => {
      normalizedDriver.documents[field] = getPublicMediaUrl(normalizedDriver.documents[field]);
    });
  }

  return normalizedDriver;
};

export const normalizePassengerMediaUrls = (passenger) => {
  if (!passenger || typeof passenger !== "object") return passenger;

  return {
    ...passenger,
    profileImage: getPublicMediaUrl(passenger.profileImage),
  };
};
