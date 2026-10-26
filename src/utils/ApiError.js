// Error carrying an HTTP status code (and optional field errors),
// thrown from services/controllers and formatted by the error handler.
export default class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message)
    this.statusCode = statusCode
    if (errors) this.errors = errors
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message)
  }

  static conflict(message, errors) {
    return new ApiError(409, message, errors)
  }
}