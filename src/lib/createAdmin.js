// utils/createAdmin.js
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';

export const createAdminIfNotExists = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('✅ Admin user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Other',
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
  } catch (err) {
    console.error('❌ Failed to create admin user:', err);
  }
};
