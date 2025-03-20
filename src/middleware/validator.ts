import Joi from 'joi';
import { CustomContext } from '../types/index';

export type ValidationSchema = Joi.ObjectSchema<any> | {
  body?: Joi.ObjectSchema<any>;
  query?: Joi.ObjectSchema<any>;
  params?: Joi.ObjectSchema<any>;
};

export const validate = (schema: ValidationSchema) => {
  return async (ctx: CustomContext, next: () => Promise<any>) => {
    try {
      if (Joi.isSchema(schema)) {
        ctx.request.body = await schema.validateAsync(ctx.request.body, {
          abortEarly: false,
          stripUnknown: true
        });
      } else {
        if (schema.body) {
          ctx.request.body = await schema.body.validateAsync(ctx.request.body, {
            abortEarly: false,
            stripUnknown: true
          });
        }
        if (schema.query) {
          ctx.query = await schema.query.validateAsync(ctx.query, {
            abortEarly: false,
            stripUnknown: true
          });
        }
        if (schema.params) {
          ctx.params = await schema.params.validateAsync(ctx.params, {
            abortEarly: false,
            stripUnknown: true
          });
        }
      }
      return next();
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: err.details ? err.details[0].message : err.message,
        data: null
      };
      return;
    }
  };
};

// 用户相关的验证schema
export const userSchemas: Record<string, Joi.ObjectSchema<any>> = {
  register: Joi.object({
    username: Joi.string().required().min(3).max(30).messages({
      'string.min': '用户名长度不能小于3个字符',
      'string.max': '用户名长度不能超过30个字符',
      'any.required': '用户名不能为空'
    }),
    email: Joi.string().required().email().messages({
      'string.email': '请输入有效的邮箱地址',
      'any.required': '邮箱不能为空'
    }),
    password: Joi.string().required().min(6).max(30).messages({
      'string.min': '密码长度不能小于6个字符',
      'string.max': '密码长度不能超过30个字符',
      'any.required': '密码不能为空'
    }),
    phone: Joi.string().pattern(/^[0-9]{11}$/).optional().messages({
      'string.pattern.base': '请输入有效的手机号码'
    })
  }),
  login: Joi.object({
    username: Joi.string().required().messages({
      'any.required': '用户名不能为空'
    }),
    password: Joi.string().required().messages({
      'any.required': '密码不能为空'
    })
  }),
  verifyPassword: Joi.object({
    username: Joi.string().optional(),
    email: Joi.string().email().optional().messages({
      'string.email': '请输入有效的邮箱地址'
    }),
    password: Joi.string().required().messages({
      'any.required': '密码不能为空'
    })
  }).or('username', 'email').messages({
    'object.missing': '用户名或邮箱必须提供一个'
  })
};
