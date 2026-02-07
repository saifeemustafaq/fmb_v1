import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Role } from "@/lib/auth/constants";

export type UserRecord = {
  _id: ObjectId;
  name: string;
  its: number;
  passwordHash: string;
  phoneOrEmail?: string;
  role: Role;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function getUsersCollection() {
  const client = await clientPromise;
  return client.db().collection<UserRecord>("users");
}

export async function findUserByITS(its: number) {
  const users = await getUsersCollection();
  return users.findOne({ its });
}
