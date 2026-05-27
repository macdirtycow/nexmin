/** Panel/API errors — never expose third-party product names in `name` or messages. */
export class PanelError extends Error {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly raw?: string,
  ) {
    super(message);
    this.name = "PanelError";
  }
}
