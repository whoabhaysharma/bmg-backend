import prisma from './prisma';
import { Role } from '@prisma/client';

import { config } from '../config/config';

export const initializeAdmin = async () => {
  try {
    const adminPhoneNumber = config.admin.phoneNumber;

    if (!adminPhoneNumber) {
      console.warn('⚠️  ADMIN_PHONE_NUMBER not set in environment variables');
      return;
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        mobileNumber: adminPhoneNumber,
      },
    });

    if (existingAdmin) {
      // If exists, ensure they have ADMIN role
      if (!existingAdmin.roles.includes(Role.ADMIN)) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            roles: {
              push: Role.ADMIN,
            },
          },
        });

        // Invalidate cache to ensure admin role is reflected immediately
        const { invalidateUserCache } = await import('../middleware/isAuthenticated');
        invalidateUserCache(existingAdmin.id);

        console.log(`✓ Added ADMIN role to existing user with phone: ${adminPhoneNumber}`);
      } else {
        console.log(`✓ Admin user already exists with phone: ${adminPhoneNumber}`);
      }
      return;
    }

    // Create new admin user
    const adminUser = await prisma.user.create({
      data: {
        mobileNumber: adminPhoneNumber,
        name: 'Admin User',
        roles: [Role.ADMIN, Role.USER],
      },
    });

    console.log(`✓ Admin user created successfully with phone: ${adminPhoneNumber}`);
    console.log(`✓ User ID: ${adminUser.id}`);
  } catch (error) {
    console.error('✗ Failed to initialize admin user:', error);
    process.exit(1);
  }
};
