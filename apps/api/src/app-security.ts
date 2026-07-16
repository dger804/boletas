type ResponseWithHeaders = {
  setHeader: (name: string, value: string) => void;
};

type NextFunction = () => void;

export const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
} as const;

export const getAllowedCorsOrigins = (environment = process.env) => {
  const origins =
    environment.CORS_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (environment.NODE_ENV === "production" && origins.length === 0) {
    throw new Error("CORS_ORIGIN is required in production");
  }

  return origins;
};

export const securityHeadersMiddleware = (
  _request: unknown,
  response: ResponseWithHeaders,
  next: NextFunction
) => {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    response.setHeader(name, value);
  });
  next();
};
