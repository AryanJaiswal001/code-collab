let runtimeOutputBuffer = "";

export function getWebContainerRuntimeOutputBuffer() {
  return runtimeOutputBuffer;
}

export function appendWebContainerRuntimeOutput(chunk: string) {
  runtimeOutputBuffer += chunk;
}

export function resetWebContainerRuntimeOutput() {
  runtimeOutputBuffer = "";
}
