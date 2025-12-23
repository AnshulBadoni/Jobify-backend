import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = path.resolve(__dirname, "platform.proto");

// Loading proto dynamically
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true, 
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDef) as any;

const ProfileAIService = proto.jobplatform.ProfileAIService;

const client = new ProfileAIService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

export function generateSummary(usernames: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        client.GenerateGitHubSummary({ usernames }, (err: any, res: any) => {
            if (err) {
                console.error("❌ gRPC error:", err);
                reject(err);
            } else {
                console.log("✅ gRPC response:", res);
                resolve(res);
            }
        });
    });
}


export function getSimilarity(text1: string, text2: string): Promise<any> {
    return new Promise((resolve, reject) => {
        client.GetSimilarity({ text1, text2 }, (err: any, res: any) => {
            if (err) {
                console.error("❌ gRPC error:", err);
                reject(err);
            } else {
                console.log("✅ gRPC response:", res);
                resolve(res);
            }
        });
    });
}

export function updateResume(userId: string, resumeText: string): Promise<any> {
    return new Promise((resolve, reject) => {
        client.UpdateResume({ userId, resumeText }, (err: any, res: any) => {
            if (err) {
                console.error("❌ gRPC error:", err);
                reject(err);
            } else {
                console.log("✅ gRPC response:", res);
                resolve(res);
            }
        });
    });
}