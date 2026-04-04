import { WorkspaceServiceError } from "./server";

export function handleWorkspaceRouteError(error: unknown) {
  if (error instanceof WorkspaceServiceError) {
    return Response.json(
      {
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  return Response.json(
    {
      error: "Something went wrong while processing that workspace request.",
    },
    {
      status: 500,
    },
  );
}
