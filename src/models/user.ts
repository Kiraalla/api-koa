import bcrypt from 'bcryptjs';
import { CreateOptions, DataTypes, Model, UpdateOptions } from 'sequelize';
import sequelize from '../config/database';

class User extends Model {
  static hooks: {
    beforeCreate: ((user: User, options: CreateOptions) => Promise<void>)[];
    beforeUpdate: ((user: User, options: UpdateOptions) => Promise<void>)[];
  };
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public phone?: string;
  public avatar?: string;
  public role!: string;
  public status!: string;
  public last_login?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    // 不记录敏感信息，直接比较密码
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'users_username_key',
      msg: '该用户名已被使用'
    },
    validate: {
      len: {
        args: [3, 30],
        msg: '用户名长度必须在3-30个字符之间'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'users_email_key',
      msg: '该邮箱已被注册'
    },
    validate: {
      isEmail: {
        msg: '请输入有效的邮箱地址'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [6, 100],
        msg: '密码长度必须在6-100个字符之间'
      }
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: {
        args: /^1[3-9]\d{9}$/,
        msg: '请输入有效的手机号码'
      }
    }
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'guest'),
    allowNull: false,
    defaultValue: 'user',
    validate: {
      isIn: {
        args: [['admin', 'user', 'guest']],
        msg: '无效的用户角色'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: {
        args: [['active', 'inactive', 'suspended']],
        msg: '无效的用户状态'
      }
    }
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'user',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    }
  ]
});

// 使用固定的盐值进行密码加密
const SALT_ROUNDS = 10;

// 添加钩子函数，在创建和更新用户时加密密码
User.beforeCreate(async (user: User) => {
  try {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
  } catch (error) {
    throw new Error('密码加密失败');
  }
});

User.beforeUpdate(async (user: User) => {
  try {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
  } catch (error) {
    throw new Error('密码加密失败');
  }
});

export default User;