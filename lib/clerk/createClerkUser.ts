import clerk from "@clerk/clerk-sdk-node";

export async function createClerkUser({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  try {
    const user = await clerk.users.createUser({
      emailAddress: [email],
      firstName: name,
    });

    return user;
  } catch (error) {
    console.error("Error creating user in Clerk:", error);
    throw new Error("Clerk user creation failed");
  }
}
