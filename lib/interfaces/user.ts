import { ObjectId } from "mongodb";
import type { Role } from "@/lib/auth/constants";

export type UserRecord = {
  _id?: ObjectId;
  name: string;
  its: number;
  passwordHash: string;
  phoneOrEmail?: string;
  role: Role;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateUserInput = {
  name: string;
  its: number;
  password: string; // Will be hashed
  phoneOrEmail?: string;
  role: Role;
};

export type UpdateUserInput = {
  name?: string;
  phoneOrEmail?: string;
  role?: Role;
  isActive?: boolean;
};

export type UserListFilters = {
  role?: Role;
  isActive?: boolean;
  sortBy?: "name" | "its" | "createdAt";
  sortOrder?: "asc" | "desc";
};
