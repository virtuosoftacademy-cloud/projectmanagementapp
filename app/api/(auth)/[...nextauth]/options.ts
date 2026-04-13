
// import GithubProvider from "next-auth/providers/github";
// import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/app/lib/prisma";

export const options = {
  providers: [
    // GithubProvider({
    //   profile(profile) {
    //     console.log("profile Github: ", profile);

    //     let userRole = "Github User";
    //     if (profile?.email == "faisalsagheerqureshi@gmail.com") {
    //       userRole = "admin";
    //     }
    //     return {
    //       ...profile,
    //       role: userRole,
    //     };
    //   },
    //   clientId: process.env.GITHUB_ID,
    //   clientSecret: process.env.GITHUB_Secret,
    // }),

    // GoogleProvider({
    //   profile(profile) {
    //     console.log("profile Google: ", profile);
    //     let userRole = "Google User";
    //     return {
    //       ...profile,
    //       id: profile.sub,
    //       role: userRole,
    //     };
    //   },
    //   clientId: process.env.GOOGLE_ID,
    //   clientSecret: process.env.GOOGLE_Secret,
    // }),
    Credentials({
      // name: "Credentials",
      // credentials: {
      //   name: {
      //     label: "name",
      //     type: "text",
      //     placeholder: "your-name",
      //   },
      //   password: {
      //     label: "password",
      //     type: "password",
      //     placeholder: "your-password",
      //   },
      // },
      async authorize(credentials) {
        await prisma.$connect();
        try {
          const foundUser = await User.findOne({ name: credentials.name })
            .lean()
            .exec();

          if (foundUser) {
            // console.log("User Exist");
            const match = await bcrypt.compare(
              credentials.password,
              foundUser.password
            );
            if (match) {
              // console.log("Good Pass");
              delete foundUser.password;
              // foundUser["role"] = "Unverified";
              // foundUser["role"] = "admin";
              return foundUser;
            }
            else {
              console.log("Wrong")
              return null;
            }
          }
        } catch (error) {
          console.log(error);
        }
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/api/auth/signIn',
    signOut: '/',
  }
};
