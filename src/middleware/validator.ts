import Joi from 'joi';
import { CustomContext } from '../types';

export type ValidationSchema = Joi.ObjectSchema<any> | {
  body?: Joi.ObjectSchema<any>;
  query?: Joi.ObjectSchema<any>;
  params?: Joi.ObjectSchema<any>;
};

export const validate = (schema: ValidationSchema) => {
  return async (ctx: CustomContext, next: () => Promise<any>) => {
    try {
      if (Joi.isSchema(schema)) {
        ctx.request.body = await schema.validateAsync(ctx.request.body);
      } else {
        if (schema.body) {
          ctx.request.body = await schema.body.validateAsync(ctx.request.body);
        }
        if (schema.query) {
          ctx.query = await schema.query.validateAsync(ctx.query);
        }
        if (schema.params) {
          ctx.params = await schema.params.validateAsync(ctx.params);
        }
      }
      await next();
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: err.details[0].message,
        data: null
      };
    }
  };
};

// 用户相关的验证schema
export const userSchemas: Record<string, Joi.ObjectSchema<any>> = {
  register: Joi.object({
    username: Joi.string().required().min(3).max(30),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6).max(30),
    phone: Joi.string().pattern(/^[0-9]{11}$/).optional()
  }),
login: Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required()
  })
};
