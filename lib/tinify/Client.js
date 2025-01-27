"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const url = require("url");
const fs = require("fs");
const proxyAgent = require("proxying-agent");
const package_json_1 = require("../../package.json");
const tinify_1 = require("../tinify");
const boundaries = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----\n/g;
const data = fs.readFileSync(`${__dirname}/data/cacert.pem`).toString();
class Client {
    /** @internal */
    constructor(key, appIdentifier, proxy) {
        const klass = this.constructor;
        this.userAgent = [klass.USER_AGENT, appIdentifier].filter(Boolean).join(" ");
        this.defaultOptions = {
            ca: klass.CA_BUNDLE,
            rejectUnauthorized: true,
            auth: `api:${key}`,
        };
        if (proxy) {
            if (!url.parse(proxy).hostname) {
                throw new tinify_1.default.ConnectionError("Invalid proxy");
            }
            /* Note: although keepAlive is enabled, the proxy agent reconnects to the
               proxy server each time. This makes proxied requests slow. There
               seems to be no proxy tunneling agent that reuses TLS connections. */
            this.defaultOptions.agent = proxyAgent.create({
                proxy,
                keepAlive: true,
            }, klass.API_ENDPOINT);
        }
    }
    /** @internal */
    request(method, path, body) {
        const klass = this.constructor;
        const options = url.parse(url.resolve(klass.API_ENDPOINT, path));
        options.method = method;
        options.headers = {};
        Object.assign(options, this.defaultOptions);
        options.headers["User-Agent"] = this.userAgent;
        if (typeof body === "object" && !Buffer.isBuffer(body)) {
            if (Object.keys(body).length) {
                /* Encode as JSON. */
                body = JSON.stringify(body);
                options.headers["Content-Type"] = "application/json";
                options.headers["Content-Length"] = body.length;
            }
            else {
                /* No options, send without body. */
                body = undefined;
            }
        }
        let retries = klass.RETRY_COUNT + 1;
        return new Promise((resolve, reject) => {
            const exec = () => {
                retries -= 1;
                const request = https.request(options, (response) => {
                    const count = response.headers["compression-count"];
                    if (count) {
                        tinify_1.default.compressionCount = parseInt(count, 10);
                    }
                    const chunks = [];
                    response.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    response.on("end", () => {
                        const body = Buffer.concat(chunks);
                        if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve({ headers: response.headers, body });
                        }
                        else {
                            let details;
                            try {
                                details = JSON.parse(body.toString());
                            }
                            catch (err) {
                                details = {
                                    message: `Error while parsing response: ${err.message}`,
                                    error: "ParseError",
                                };
                            }
                            if (retries > 0 && response.statusCode && response.statusCode >= 500) {
                                return setTimeout(exec, klass.RETRY_DELAY);
                            }
                            reject(tinify_1.default.Error.create(details.message, details.error, response.statusCode));
                        }
                    });
                });
                request.on("error", err => {
                    if (retries > 0) {
                        return setTimeout(exec, klass.RETRY_DELAY);
                    }
                    reject(new tinify_1.default.ConnectionError(`Error while connecting: ${err.message}`));
                });
                request.end(body);
            };
            exec();
        });
    }
}
/** @internal */
Client.API_ENDPOINT = "https://api.tinify.com";
/** @internal */
Client.RETRY_COUNT = 1;
/** @internal */
Client.RETRY_DELAY = 500;
/** @internal */
Client.USER_AGENT = `Tinify/${package_json_1.version} Node/${process.versions.node} (${process.platform})`;
/** @internal */
Client.CA_BUNDLE = data.match(boundaries);
exports.default = Client;
