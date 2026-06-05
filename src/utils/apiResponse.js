export function sendSuccess(res, httpStatus, message, data = null, extra = {}) {
  return res.status(httpStatus).json({
    status: true,
    message,
    data,
    ...extra,
  });
}

export function sendError(res, httpStatus, message, errors) {
  return res.status(httpStatus).json({
    status: false,
    message,
    errors,
  });
}
