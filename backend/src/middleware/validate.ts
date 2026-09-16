import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';

// ============================================================================
// Request Validation Middleware using Zod
// Validates body, query, and/or params against Zod schemas.
// Redefines req.query and req.params on the request instance with parsed values.
// ============================================================================

type ZodSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export interface RequestValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schema: RequestValidationSchema): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        const parsedParams = (await schema.params.parseAsync(req.params)) as Record<string, string>;
        Object.defineProperty(req, 'params', {
          value: parsedParams,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}

export const validateBody = (schema: ZodSchema): RequestHandler =>
  validate({ body: schema });

export const validateQuery = (schema: ZodSchema): RequestHandler =>
  validate({ query: schema });

export const validateParams = (schema: ZodSchema): RequestHandler =>
  validate({ params: schema });
