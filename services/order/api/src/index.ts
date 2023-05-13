import awsServerlessExpress from "aws-serverless-express";
import express, { Application, Request, Response } from "express";

const app: Application = express();

app.get("/", (request: Request, response: Response) => {
  console.log("Received request to /. Query string:", request.query);
  response.send("Home");
});

app.post(
  "/order",
  (
    request: Request<
      {},
      { message: string; orderId: string; userId: string },
      { orderId: string; userId: string }
    >,
    response: Response
  ) => {
    console.log("Creating order...", request.body);
    response.send({
      message: "created order",
      ...request.body,
    });
  }
);

app.get(
  "/path/:name",
  (request: Request<{ name: string }>, response: Response) => {
    console.log(`Received request to /path/${request.params.name}`);
    response.send({
      Message: "Response to your request",
      baseUrl: request.baseUrl,
      headers: request.headers,
      originalUrl: request.originalUrl,
      path: request.path,
      params: request.params,
    });
  }
);

const userService = express();
userService.use("/order", app);

userService.listen(8000, () => {
  console.log("Serving on port 8000.");
});

const server = awsServerlessExpress.createServer(userService);

export const handler = (event: any, context: any) => {
  awsServerlessExpress.proxy(server, event, context);
};
