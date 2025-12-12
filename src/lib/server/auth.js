import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import prisma from '@/prisma/index';
import { sendMagicLinkEmail, sendWelcomeEmail } from '@/lib/server/mail';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
const isProduction = process.env.NODE_ENV === 'production';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    jwt: async ({ token, user, account, profile, isNewUser }) => {
      if (user) {
        console.log("Setting user info in JWT token:", { 
          userId: user.id, 
          email: user.email 
        });
        token.userId = user.id;
        token.email = user.email;
      }
      return token;
    },
    session: async ({ session, user, token }) => {
      console.log("Session callback called with:", { 
        hasUser: !!user, 
        hasToken: !!token,
        userKeys: user ? Object.keys(user) : [],
        tokenKeys: token ? Object.keys(token) : []
      });
      
      if (session.user) {
        // Ensure userId is set from either user object or token
        if (user?.id) {
          session.user.userId = user.id;
          console.log("Set userId from user.id:", user.id);
        } else if (token?.userId) {
          session.user.userId = token.userId;
          console.log("Set userId from token.userId:", token.userId);
        } else if (token?.sub) {
          session.user.userId = token.sub;
          console.log("Set userId from token.sub:", token.sub);
        }
        
        // Make sure user.id is also set if not already
        if (!session.user.id && session.user.userId) {
          session.user.id = session.user.userId;
        }
      }
      
      if (token) {
        session.token = token;
      }
      
      console.log("Final session object:", {
        userId: session.user?.userId,
        id: session.user?.id,
        hasToken: !!session.token
      });
      
      return session;
    },
  },
  events: {
    signIn: async ({ user, isNewUser }) => {
      console.log("Sign-in event:", { userId: user.id, isNewUser, email: user.email });

      // Sync user to MongoDB airank.users collection
      try {
        const mongoose = require('mongoose');
        const airankUri = `${process.env.MONGODB_URI}/airank?${process.env.MONGODB_PARAMS}`;
        const airankDb = mongoose.createConnection(airankUri);
        await airankDb.asPromise();

        const usersCollection = airankDb.collection('users');
        const membersCollection = airankDb.collection('members');

        // Check if user already exists (to determine if this is truly a first login)
        const existingUser = await usersCollection.findOne({ _id: user.id });
        const isFirstLogin = !existingUser;

        // Check if there's an existing user document with this email but different ID (created during invite)
        const existingUserByEmail = await usersCollection.findOne({ email: user.email, _id: { $ne: user.id } });

        // If there's an old user document created during invite, update member records to use the NextAuth user ID
        if (existingUserByEmail) {
          const updateResult = await membersCollection.updateMany(
            { userId: existingUserByEmail._id },
            { $set: { userId: user.id, updatedAt: new Date() } }
          );
          console.log("Updated member records from old userId to NextAuth userId:", {
            oldUserId: existingUserByEmail._id,
            newUserId: user.id,
            updatedCount: updateResult.modifiedCount
          });

          // Delete the old user document (it was just a placeholder)
          await usersCollection.deleteOne({ _id: existingUserByEmail._id });
          console.log("Deleted placeholder user document:", existingUserByEmail._id);
        }

        // Upsert user (create or update)
        await usersCollection.updateOne(
          { _id: user.id },
          {
            $set: {
              _id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date(),
              welcomeEmailSent: false
            }
          },
          { upsert: true }
        );

        console.log("User synced to MongoDB:", { userId: user.id, email: user.email });

        // Send welcome email on first login
        if (isFirstLogin || isNewUser) {
          try {
            await sendWelcomeEmail({
              to: user.email,
              name: user.name || user.email.split('@')[0],
              email: user.email,
            });

            // Mark welcome email as sent
            await usersCollection.updateOne(
              { _id: user.id },
              { $set: { welcomeEmailSent: true, welcomeEmailSentAt: new Date() } }
            );

            console.log("Welcome email sent to new user:", user.email);
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
          }
        }

        await airankDb.close();
      } catch (error) {
        console.error("Error syncing user to MongoDB:", error);
      }

      // const customerPayment = await getPayment(user.email);
      // if (isNewUser || customerPayment === null || user.createdAt === null) {
      //   await Promise.all([createPaymentAccount(user.email, user.id)]);
      // }
    },
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, request }) => {
        // Extract browser/OS info from request headers if available
        const userAgent = request?.headers?.['user-agent'] || '';
        let operatingSystem = 'Unknown';
        let browserName = 'Unknown';

        // Parse OS from user agent
        if (userAgent.includes('Windows')) operatingSystem = 'Windows';
        else if (userAgent.includes('Mac')) operatingSystem = 'macOS';
        else if (userAgent.includes('Linux')) operatingSystem = 'Linux';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) operatingSystem = 'iOS';
        else if (userAgent.includes('Android')) operatingSystem = 'Android';

        // Parse browser from user agent
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browserName = 'Chrome';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
        else if (userAgent.includes('Firefox')) browserName = 'Firefox';
        else if (userAgent.includes('Edg')) browserName = 'Edge';

        // Send magic link email via Postmark (logs in dev, sends in prod)
        await sendMagicLinkEmail({
          to: email,
          name: email.split('@')[0],
          actionUrl: url,
          operatingSystem,
          browserName,
        });
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    strategy: "jwt",
  },
};
