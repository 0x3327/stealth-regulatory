import express, { Express, Request, Response } from "express";
import Regulator from "./regulator";

const sendResponse = (res: Response, status: number, message: string, data?: any) => {
    res.status(status);
    const response = {
        message,
        status,
        data,
    };
    res.send(response);
};

const sendResponseOK = (res: Response, message: string, data?: any) => {
    sendResponse(res, 200, message, data);
};

const sendResponseBadRequest = (res: Response, message: string, data?: any) => {
    sendResponse(res, 400, message, data);
};

class API {
    private host: string;
    private port: number;
    private server: Express;
    private regulator: Regulator;

    constructor(host: string, port: number, registeredUsersFilePath: string) {
        this.host = host;
        this.port = port;
        this.server = express();
        this.regulator = new Regulator(registeredUsersFilePath);

        this.exposeRoutes();
    }

    private exposeRoutes() {
        // write route handlers

        this.server.get('/', (req: Request, res: Response) => {
            sendResponseOK(res, "Service running", {timestamp: Date.now()});
        });

    }

    public async start() {
        await this.regulator.init();
        this.server.listen(this.port, this.host, () => {
            console.log(`Started listening on ${this.host}:${this.port}`);
        }) 
    }
}

export default API;