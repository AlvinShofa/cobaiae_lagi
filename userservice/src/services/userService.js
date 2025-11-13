const grpc = require('@grpc/grpc-js');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const userService = {
  Register: async (call, callback) => {
    const { name, email, password, phone_number } = call.request;

    try {
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Email already exists',
        });
      }
      
      if (phone_number) {
        const phoneExists = await User.findOne({ where: { phoneNumber: phone_number } });
        if (phoneExists) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: 'Phone number already exists',
          });
        }
      }

      const user = await User.create({
        name,
        email,
        password,
        phoneNumber: phone_number,
        role: 'user',
      });

      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone_number: user.phoneNumber,
          created_at: user.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  },

  Login: async (call, callback) => {
    const { email, password } = call.request;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(user.id, user.role);
      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone_number: user.phoneNumber,
        },
        token: token,
      });
    } catch (error) {
      console.error(error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  },

  GetUser: async (call, callback) => {
    const { id } = call.request;
    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }, 
      });

      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found',
        });
      }

      callback(null, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone_number: user.phoneNumber,
          created_at: user.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  },
  
  ListUsers: async (call, callback) => {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
      });

      const userList = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phoneNumber,
        created_at: user.createdAt.toISOString(),
      }));

      callback(null, { users: userList });
    } catch (error)
 {
      console.error(error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  },

  // Implementasikan fungsi UpdateUser dan DeleteUser
  UpdateUser: async (call, callback) => {
    // ... (Logika untuk update user) ...
  },
  DeleteUser: async (call, callback) => {
    // ... (Logika untuk delete user) ...
  },
};

module.exports = userService;