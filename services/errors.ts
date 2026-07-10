// Lets a service signal a specific HTTP status code back to its route handler,
// so routes can preserve their exact pre-refactor status codes without
// re-implementing per-case logic in every catch block.
export class ServiceError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}
