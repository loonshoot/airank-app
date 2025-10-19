import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { emailConfig, sendMail } from '@/lib/server/mail';
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
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        console.log("User synced to MongoDB:", { userId: user.id, email: user.email });

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
      server: emailConfig,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const { host } = new URL(url);
        
        if (isProduction) {
          await sendMail({
            html: html({ email, url }),
            subject: `[AI Rank] Sign in to ${host}`,
            text: text({ email, url }),
            to: email,
          });
        } else {
          console.log("Dev Magic Link:" + url)
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    strategy: "jwt",
  },
};
