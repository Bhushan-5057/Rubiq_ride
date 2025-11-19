import dotenv from 'dotenv';
import { Admin } from '../models/admin/Admin.model.js';

dotenv.config();

export async function seedAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL ;
    const password = process.env.ADMIN_PASSWORD ;
    const name = process.env.ADMIN_NAME ;

    const existingAdmin = await Admin.findOne({ email,name });
    if (existingAdmin) {
      console.log(`Admin already exists: ${email}`);
      return;
    }

    await Admin.create({
      email,
      password,
      name,
      role: 'admin',
    });

    console.log(`Admin account created successfully: ${email}`);
  } catch (err) {
    console.error('Error while creating admin:', err.message || err);
  }
}
