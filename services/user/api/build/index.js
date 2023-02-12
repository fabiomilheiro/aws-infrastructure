"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get("/:name", (request, response) => {
    response.send({
        Message: "Response to your request",
        baseUrl: request.baseUrl,
        headers: request.headers,
        originalUrl: request.originalUrl,
        path: request.path,
        params: request.params,
    });
});
app.listen(8000, () => {
    console.log("Serving on port 8000.");
});
