import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Role } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth";
import type {
  UserRecord,
  CreateUserInput,
  UpdateUserInput,
  UserListFilters,
} from "@/lib/interfaces/user";

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
  return client.db("fmb").collection<UserRecord>("users");
}

export async function findUserByITS(its: number) {
  const users = await getUsersCollection();
  return users.findOne({ its });
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserInput): Promise<UserRecord> {
  const users = await getUsersCollection();

  // Hash password before storing
  const passwordHash = await hashPassword(data.password);

  const user: UserRecord = {
    name: data.name,
    its: data.its,
    passwordHash,
    phoneOrEmail: data.phoneOrEmail,
    role: data.role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await users.insertOne(user);
  return { ...user, _id: result.insertedId };
}

/**
 * Get all users with optional filters
 */
export async function getAllUsers(
  filters?: UserListFilters
): Promise<UserRecord[]> {
  const users = await getUsersCollection();

  const query: any = {};
  if (filters?.role) {
    query.role = filters.role;
  }
  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  const sortField = filters?.sortBy || "createdAt";
  const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;

  return users
    .find(query)
    .sort({ [sortField]: sortOrder })
    .toArray();
}

/**
 * Get user by ID
 */
export async function getUserById(
  id: string | ObjectId
): Promise<UserRecord | null> {
  const users = await getUsersCollection();
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return users.findOne({ _id: objectId });
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: Role): Promise<UserRecord[]> {
  const users = await getUsersCollection();
  return users.find({ role }).toArray();
}

/**
 * Update user information (excludes password)
 */
export async function updateUser(
  id: string | ObjectId,
  updates: UpdateUserInput
): Promise<boolean> {
  const users = await getUsersCollection();
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const result = await users.updateOne(
    { _id: objectId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update user password
 */
export async function updateUserPassword(
  id: string | ObjectId,
  newPassword: string
): Promise<boolean> {
  const users = await getUsersCollection();
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const passwordHash = await hashPassword(newPassword);

  const result = await users.updateOne(
    { _id: objectId },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(
  id: string | ObjectId
): Promise<boolean> {
  const users = await getUsersCollection();
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const result = await users.updateOne(
    { _id: objectId },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Reactivate user
 */
export async function reactivateUser(
  id: string | ObjectId
): Promise<boolean> {
  const users = await getUsersCollection();
  const objectId = typeof id === "string" ? new ObjectId(id) : id;

  const result = await users.updateOne(
    { _id: objectId },
    {
      $set: {
        isActive: true,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Check if ITS number already exists
 */
export async function checkITSExists(its: number): Promise<boolean> {
  const users = await getUsersCollection();
  const count = await users.countDocuments({ its });
  return count > 0;
}

/**
 * Count total users
 */
export async function countUsers(filters?: {
  role?: Role;
  isActive?: boolean;
}): Promise<number> {
  const users = await getUsersCollection();

  const query: any = {};
  if (filters?.role) {
    query.role = filters.role;
  }
  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  return users.countDocuments(query);
}
