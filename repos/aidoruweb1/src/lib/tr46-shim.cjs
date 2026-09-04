// Minimal tr46 replacement used only by whatwg-url (pulled in by the mongodb
// driver to parse connection strings). The real tr46 does `require("punycode/")`,
// which the Cloudflare Worker bundler cannot resolve. Connection-string hosts are
// always ASCII, so IDNA transcoding is a no-op here.

function toASCII(domain) {
  if (typeof domain !== "string") return null;
  // Reject obviously invalid empty labels the same way whatwg-url expects.
  if (domain === "") return "";
  return domain.toLowerCase();
}

function toUnicode(domain) {
  return { domain: String(domain), error: false };
}

module.exports = { toASCII, toUnicode };
