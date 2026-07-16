import {
  getAllowedCorsOrigins,
  SECURITY_HEADERS,
  securityHeadersMiddleware
} from "../src/app-security";

describe("app security", () => {
  it("parses configured CORS origins and ignores empty entries", () => {
    expect(
      getAllowedCorsOrigins({
        CORS_ORIGIN: "https://boletas.example.com, https://api.example.com, ",
        NODE_ENV: "production"
      })
    ).toEqual(["https://boletas.example.com", "https://api.example.com"]);
  });

  it("requires CORS_ORIGIN in production", () => {
    expect(() => getAllowedCorsOrigins({ NODE_ENV: "production" })).toThrow(
      "CORS_ORIGIN is required in production"
    );
  });

  it("allows permissive local CORS when no origin is configured", () => {
    expect(getAllowedCorsOrigins({ NODE_ENV: "development" })).toEqual([]);
  });

  it("sets the baseline API security headers", () => {
    const setHeader = jest.fn();
    const next = jest.fn();

    securityHeadersMiddleware({}, { setHeader }, next);

    Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
      expect(setHeader).toHaveBeenCalledWith(name, value);
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
