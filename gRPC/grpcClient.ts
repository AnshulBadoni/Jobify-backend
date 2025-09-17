import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

// Path to your proto file
const PROTO_PATH = path.resolve(__dirname, "platform.proto");

// Load proto dynamically
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

// Get the package definition
const proto = grpc.loadPackageDefinition(packageDef) as any;

// Grab your service from the proto
const ProfileAIService = proto.jobplatform.ProfileAIService;

// Create a client
const client = new ProfileAIService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

// Example usage: Call GenerateGitHubSummary
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
