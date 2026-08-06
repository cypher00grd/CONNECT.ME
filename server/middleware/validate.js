import { ZodError } from 'zod';

export const validate = ({ body, params, query } = {}) => {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }

      if (params) {
        req.params = params.parse(req.params);
      }

      if (query) {
        req.validatedQuery = query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        const firstError = errors[0];
        const fieldName = firstError?.path
          ? firstError.path.charAt(0).toUpperCase() + firstError.path.slice(1)
          : '';

        return res.status(400).json({
          success: false,
          message: firstError
            ? `${fieldName ? `${fieldName}: ` : ''}${firstError.message}`
            : 'Invalid request data',
          errors
        });
      }

      next(error);
    }
  };
};
