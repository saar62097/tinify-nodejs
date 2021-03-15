"use strict";
const tinify_1 = require("./tinify");
const Client_1 = require("./tinify/Client");
const Result_1 = require("./tinify/Result");
const ResultMeta_1 = require("./tinify/ResultMeta");
const Source_1 = require("./tinify/Source");
const Error_1 = require("./tinify/Error");
tinify_1.default.Client = Client_1.default;
tinify_1.default.ResultMeta = ResultMeta_1.default;
tinify_1.default.Result = Result_1.default;
tinify_1.default.Source = Source_1.default;
tinify_1.default.Error = Error_1.Error;
tinify_1.default.AccountError = Error_1.AccountError;
tinify_1.default.ClientError = Error_1.ClientError;
tinify_1.default.ServerError = Error_1.ServerError;
tinify_1.default.ConnectionError = Error_1.ConnectionError;
module.exports = tinify_1.default;