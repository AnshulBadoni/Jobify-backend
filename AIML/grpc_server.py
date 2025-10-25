import grpc
import grpc.aio

import platform_pb2
import platform_pb2_grpc
from controllers.profile import generate_profile


from controllers.profile import generate_profile_data

class ProfileAIServiceServicer(platform_pb2_grpc.ProfileAIServiceServicer):
    async def GenerateGitHubSummary(self, request, context):
        usernames = ",".join(request.usernames)
        summary_data = await generate_profile_data(usernames)
        overall = summary_data.get("overall_summary", {})
        return platform_pb2.GitHubSummaryResponse(
            overall_summary=overall.get("overall_summary", ""),
            overall_rating=overall.get("overall_rating", 0.0),
            overall_tips=overall.get("overall_tips", []),
            top_languages=overall.get("top_languages", []),
        )
    
    async def uploadResume(self, request, context):
        pass
    
    async def updateResume(self, request, context):
        pass
    
    async def generateResume(self, request, context):
        pass
    
class VectorAIService(platform_pb2_grpc.VectorAIServiceServicer):

    async def GetEmbedding(self, request, context):
        return platform_pb2.EmbeddingResponse(embedding=[1.0, 2.0, 3.0])
    
    async def Similarity(self, request, context):
        return platform_pb2.SimilarityResponse(similarity=generate_profile(request.text1, request.text2))
    
    async def FastSimilarity(self, request, context):
        return super().FastSimilarity(request, context)

def create_grpc_server():
    """Factory function to create gRPC server bound to current event loop"""
    server = grpc.aio.server()
    platform_pb2_grpc.add_ProfileAIServiceServicer_to_server(ProfileAIServiceServicer(), server)
    server.add_insecure_port("[::]:50051")
    return server
