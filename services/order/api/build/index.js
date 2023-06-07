"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_serverless_express_1 = __importDefault(require("aws-serverless-express"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get("/", (request, response) => {
    console.log("Received request to /. Query string:", request.query);
    response.send("Home");
});
app.post("/order", (request, response) => {
    console.log("Creating order...", request.params);
});
app.get("/path/:name", (request, response) => {
    console.log(`Received request to /path/${request.params.name}`);
    response.send({
        Message: "Response to your request",
        baseUrl: request.baseUrl,
        headers: request.headers,
        originalUrl: request.originalUrl,
        path: request.path,
        params: request.params,
    });
});
const userService = (0, express_1.default)();
userService.use("/user", app);
userService.listen(8000, () => {
    console.log("Serving on port 8000.");
});
const server = aws_serverless_express_1.default.createServer(userService);
const handler = (event, context) => {
    aws_serverless_express_1.default.proxy(server, event, context);
};
exports.handler = handler;
